import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useConnectionStore,
  useGameStore,
  useDeckStore,
  usePlayersStore,
  useCombatStore
} from '@/stores'
import { initPeer, connectToPeer, sendMessage, onMessage } from '@/services/peerService'
import batchData from '@/../data/batches/batch.json'
import { createGameMessageRouter } from '@/game/network/createGameMessageRouter'
import { useGameActions } from './useGameActions'

const DRAW_DELAY_MS = 350
const MULLIGAN_REMOVE_DELAY_MS = 220

export function useGameSession() {
  const route = useRoute()
  const router = useRouter()

  const connection = useConnectionStore()
  const game = useGameStore()
  const deck = useDeckStore()
  const players = usePlayersStore()
  const combat = useCombatStore()
  const gameActions = useGameActions()
  const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')

  const isDrawing = ref(false)
  const drawGeneration = ref(0)
  const incomingRestartRequest = ref(null)
  const isRestartRequestPending = ref(false)
  const restartRequestStatus = ref('idle')
  const isRestarting = ref(false)

  const routeGameMessage = createGameMessageRouter({
    deck,
    game,
    players,
    resetLocalGameState
  })

  let unsubscribeMessages = null
  let waitForReady = null
  let waitForConnect = null

  function resetLocalGameState() {
    drawGeneration.value += 1
    isDrawing.value = false
    game.$reset()
    deck.$reset()
    players.$reset()
    combat.$reset()
  }

  async function initGame() {
    if (!connection.isHost || isRestarting.value) {
      return
    }

    isRestarting.value = true
    try {
      resetLocalGameState()
      incomingRestartRequest.value = null
      isRestartRequestPending.value = false
      restartRequestStatus.value = 'idle'

      deck.loadBatch(batchData)
      deck.shuffle()

      const initialTurn = Math.random() < 0.5 ? 'player_a' : 'player_b'
      game.startGame(initialTurn)

      sendMessage({
        type: 'game_init',
        payload: {
          deckCards: deck.cards,
          initialTurn,
          turnPhase: game.turnPhase
        }
      })

      const secondPlayerId = initialTurn === 'player_a' ? 'player_b' : 'player_a'
      for (const playerId of [initialTurn, secondPlayerId]) {
        await drawSequence(7, {
          playerId,
          syncEachDraw: true,
          advancePhaseAfterDraw: false,
          delayMs: DRAW_DELAY_MS
        })
        await runOpeningMulliganIfNeeded(playerId)
      }
    } finally {
      isRestarting.value = false
    }
  }

  async function runOpeningMulliganIfNeeded(playerId) {
    const player = players.players[playerId]
    if (!player) return false

    const hasHeroInOpeningHand = player.hand.some((card) => card.type === 'hero')
    if (hasHeroInOpeningHand) {
      players.clearMulliganReveal(playerId)
      return false
    }

    const openingHand = player.hand.map((card) => ({ ...card }))
    players.setMulliganReveal(playerId, openingHand)
    sendMessage({
      type: 'mulligan_reveal',
      payload: { playerId, cards: openingHand }
    })

    const removedCards = []
    while (players.players[playerId].hand.length > 0) {
      const card = players.players[playerId].hand[0]
      const removed = players.removeCardFromHand(playerId, card.id)
      if (!removed) break
      removedCards.push(removed)
      players.removeMulliganRevealCard(playerId, card.id)
      sendMessage({
        type: 'mulligan_remove_one',
        payload: { playerId, cardId: card.id }
      })
      await new Promise((resolve) => setTimeout(resolve, MULLIGAN_REMOVE_DELAY_MS))
    }

    if (removedCards.length > 0) {
      deck.cards.push(...removedCards)
      deck.shuffle()
      sendMessage({
        type: 'mulligan_deck_sync',
        payload: {
          deckCards: deck.cards
        }
      })
    }

    await drawSequence(7, {
      playerId,
      syncEachDraw: true,
      advancePhaseAfterDraw: false,
      delayMs: DRAW_DELAY_MS
    })

    players.clearMulliganReveal(playerId)
    sendMessage({
      type: 'mulligan_clear',
      payload: { playerId }
    })
    return true
  }

  function requestRestartGame() {
    if (game.phase === 'setup' || isRestartRequestPending.value || incomingRestartRequest.value) {
      return false
    }

    isRestartRequestPending.value = true
    restartRequestStatus.value = 'pending'
    const sent = sendMessage({
      type: 'restart_request',
      payload: {
        requesterId: myPlayerId.value
      }
    })

    if (!sent) {
      isRestartRequestPending.value = false
      restartRequestStatus.value = 'idle'
    }

    return sent
  }

  async function respondRestartRequest(accepted) {
    const currentRequest = incomingRestartRequest.value
    if (!currentRequest) return false

    incomingRestartRequest.value = null
    sendMessage({
      type: 'restart_response',
      payload: {
        accepted: Boolean(accepted),
        requesterId: currentRequest.requesterId
      }
    })

    if (!accepted) {
      return true
    }

    restartRequestStatus.value = 'idle'
    if (connection.isHost) {
      await initGame()
    }

    return true
  }

  async function handleRestartResponse(payload) {
    const accepted = Boolean(payload?.accepted)
    isRestartRequestPending.value = false
    restartRequestStatus.value = accepted ? 'idle' : 'declined'

    if (accepted && connection.isHost) {
      await initGame()
    }
  }

  function handlePeerMessage(data) {
    if (!data?.type) return false

    if (data.type === 'combat_request') {
      return gameActions.handleCombatRequest(data.payload || {})
    }

    if (data.type === 'combat_roll_start') {
      gameActions.receiveCombatRollStart(data.payload || {})
      return true
    }

    if (data.type === 'combat_roll_click') {
      return gameActions.handleCombatRollClick(data.payload || {})
    }

    if (data.type === 'combat_roll_step_result') {
      gameActions.receiveCombatRollStepResult(data.payload || {})
      return true
    }

    if (data.type === 'combat_roll_step_start') {
      gameActions.receiveCombatRollStepStart(data.payload || {})
      return true
    }

    if (data.type === 'combat_roll_result') {
      gameActions.receiveCombatRollResult(data.payload || {})
      return true
    }

    if (data.type === 'combat_reaction_window_start') {
      gameActions.receiveCombatReactionWindowStart(data.payload || {})
      return true
    }

    if (data.type === 'combat_reaction_response') {
      return gameActions.handleCombatReactionResponse(data.payload || {})
    }

    if (data.type === 'advance_phase_request') {
      return gameActions.handleAdvancePhaseRequest(data.payload || {})
    }

    if (data.type === 'discard_request') {
      return gameActions.handleDiscardRequest(data.payload || {})
    }

    if (data.type === 'game_end') {
      const winner = data.payload?.winner
      if (winner !== 'player_a' && winner !== 'player_b') return false
      game.endGame(winner)
      return true
    }

    if (data.type === 'restart_request') {
      incomingRestartRequest.value = {
        requesterId: data.payload?.requesterId || null
      }
      restartRequestStatus.value = 'idle'
      return true
    }

    if (data.type === 'restart_response') {
      void handleRestartResponse(data.payload || {})
      return true
    }

    return routeGameMessage(data)
  }

  onMounted(() => {
    const roomId = route.query.id
    if (!roomId) {
      router.push({ name: 'Main' })
      return
    }

    unsubscribeMessages = onMessage(handlePeerMessage)

    if (!connection.isConnected) {
      initPeer()

      waitForReady = setInterval(() => {
        if (connection.isReady) {
          clearInterval(waitForReady)
          waitForReady = null
          connectToPeer(roomId)

          waitForConnect = setInterval(() => {
            if (connection.isConnected) {
              clearInterval(waitForConnect)
              waitForConnect = null
              sendMessage({ type: 'join', payload: { peerId: connection.peerId } })
            }
          }, 100)
        }
      }, 100)
    }
  })

  onUnmounted(() => {
    if (waitForReady) {
      clearInterval(waitForReady)
      waitForReady = null
    }
    if (waitForConnect) {
      clearInterval(waitForConnect)
      waitForConnect = null
    }
    if (unsubscribeMessages) {
      unsubscribeMessages()
      unsubscribeMessages = null
    }
  })

  async function drawSequence(drawCount = 1, options = {}) {
    const {
      playerId = myPlayerId.value,
      syncEachDraw = true,
      advancePhaseAfterDraw = true,
      delayMs = DRAW_DELAY_MS
    } = options

    if (isDrawing.value) return []
    isDrawing.value = true
    const generation = drawGeneration.value
    const drawnCards = []

    for (let i = 0; i < drawCount; i++) {
      if (generation !== drawGeneration.value) break
      const drawn = deck.draw(1)
      if (drawn.length === 0) break
      const card = drawn[0]
      drawnCards.push(card)
      players.addToHand(playerId, [card])

      if (syncEachDraw) {
        sendMessage({
          type: 'draw_card',
          payload: { playerId, card }
        })
      }

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    isDrawing.value = false

    if (advancePhaseAfterDraw && generation === drawGeneration.value) {
      gameActions.advancePhase()
    }

    return drawnCards
  }

  watch(
    () => [game.turnPhase, game.currentTurn],
    ([phase, current]) => {
      if (phase === 'draw' && current === myPlayerId.value) {
        void drawSequence(1)
      }
    }
  )

  return {
    connection,
    game,
    initGame,
    requestRestartGame,
    incomingRestartRequest,
    respondRestartRequest,
    isRestartRequestPending,
    restartRequestStatus
  }
}
