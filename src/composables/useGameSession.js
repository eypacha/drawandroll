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
const OPENING_MULLIGAN_REMOVE_DELAY_MS = 100
const OPENING_HAND_SIZE = 7

function createOpeningFlowState() {
  return {
    active: false,
    firstPlayerId: null,
    mulliganCountByPlayer: {
      player_a: 0,
      player_b: 0
    },
    acceptedByPlayer: {
      player_a: false,
      player_b: false
    }
  }
}

function cloneOpeningFlowState(state) {
  const safeFirstPlayerId = state?.firstPlayerId === 'player_a' || state?.firstPlayerId === 'player_b'
    ? state.firstPlayerId
    : null
  return {
    active: Boolean(state?.active),
    firstPlayerId: safeFirstPlayerId,
    mulliganCountByPlayer: {
      player_a: Number(state?.mulliganCountByPlayer?.player_a || 0),
      player_b: Number(state?.mulliganCountByPlayer?.player_b || 0)
    },
    acceptedByPlayer: {
      player_a: Boolean(state?.acceptedByPlayer?.player_a),
      player_b: Boolean(state?.acceptedByPlayer?.player_b)
    }
  }
}

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
  const openingFlow = ref(createOpeningFlowState())
  const openingActionPending = ref(false)

  const routeGameMessage = createGameMessageRouter({
    deck,
    game,
    players,
    resetLocalGameState,
    applyOpeningMulliganState,
    applyOpeningMulliganAction,
    applyOpeningMulliganDone
  })

  let unsubscribeMessages = null
  let waitForReady = null
  let waitForConnect = null
  let openingHostActionChain = Promise.resolve(false)

  function resetLocalGameState() {
    drawGeneration.value += 1
    isDrawing.value = false
    openingHostActionChain = Promise.resolve(false)
    openingActionPending.value = false
    openingFlow.value = createOpeningFlowState()
    game.$reset()
    deck.$reset()
    players.$reset()
    combat.$reset()
  }

  function getOpponentPlayerId(playerId) {
    return playerId === 'player_a' ? 'player_b' : 'player_a'
  }

  function isValidPlayerId(playerId) {
    return playerId === 'player_a' || playerId === 'player_b'
  }

  function getOpeningHandTargetSize(playerId) {
    const mulliganCount = Number(openingFlow.value.mulliganCountByPlayer?.[playerId] || 0)
    return Math.max(0, OPENING_HAND_SIZE - mulliganCount)
  }

  function emitOpeningMulliganState() {
    sendMessage({
      type: 'opening_mulligan_state',
      payload: {
        state: openingFlow.value
      }
    })
  }

  function startOpeningMulliganFlow(firstPlayerId) {
    openingFlow.value = cloneOpeningFlowState({
      active: false,
      firstPlayerId,
      mulliganCountByPlayer: {
        player_a: 0,
        player_b: 0
      },
      acceptedByPlayer: {
        player_a: false,
        player_b: false
      }
    })
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

      const secondPlayerId = getOpponentPlayerId(initialTurn)
      startOpeningMulliganFlow(initialTurn)
      await drawSequence(OPENING_HAND_SIZE, {
        playerId: initialTurn,
        syncEachDraw: true,
        advancePhaseAfterDraw: false,
        delayMs: DRAW_DELAY_MS
      })
      await drawSequence(OPENING_HAND_SIZE, {
        playerId: secondPlayerId,
        syncEachDraw: true,
        advancePhaseAfterDraw: false,
        delayMs: DRAW_DELAY_MS
      })
      openingFlow.value.active = true
      emitOpeningMulliganState()
    } finally {
      isRestarting.value = false
    }
  }

  function applyOpeningMulliganState(payload = {}) {
    const nextState = cloneOpeningFlowState(payload?.state || createOpeningFlowState())
    openingFlow.value = nextState
    openingActionPending.value = false
    return true
  }

  function applyOpeningMulliganDone() {
    openingFlow.value = createOpeningFlowState()
    openingActionPending.value = false
    return true
  }

  function applyOpeningMulliganAction(payload = {}) {
    const action = payload?.action
    const playerId = payload?.playerId
    if (!isValidPlayerId(playerId)) return false
    if (action === 'mulligan_remove_one') {
      const cardId = payload?.cardId
      if (cardId) {
        players.removeCardFromHand(playerId, cardId)
      }
      openingActionPending.value = false
      return true
    }

    if (action === 'mulligan_deck_sync') {
      if (Array.isArray(payload?.deckCards)) {
        deck.cards = payload.deckCards
      }
      openingActionPending.value = false
      return true
    }

    if (action !== 'mulligan') {
      openingActionPending.value = false
      return true
    }
    openingActionPending.value = false
    return true
  }

  async function replaceOpeningHand(playerId, targetSize) {
    const player = players.players[playerId]
    if (!player) return null
    const removedCards = []
    const cardsToRemove = player.hand.map((card) => card.id)
    for (const cardId of cardsToRemove) {
      const card = player.hand.find((entry) => entry.id === cardId)
      if (!card) continue
      const removed = players.removeCardFromHand(playerId, card.id)
      if (!removed) continue
      removedCards.push(removed)
      sendMessage({
        type: 'opening_mulligan_action',
        payload: {
          action: 'mulligan_remove_one',
          playerId,
          cardId: card.id
        }
      })
      await new Promise((resolve) => setTimeout(resolve, OPENING_MULLIGAN_REMOVE_DELAY_MS))
    }

    if (removedCards.length > 0) {
      deck.cards.push(...removedCards)
      deck.shuffle()
      sendMessage({
        type: 'opening_mulligan_action',
        payload: {
          action: 'mulligan_deck_sync',
          playerId,
          deckCards: deck.cards
        }
      })
    }

    const actionPayload = {
      action: 'mulligan',
      playerId,
      mulliganCount: openingFlow.value.mulliganCountByPlayer[playerId],
      newHandSize: targetSize
    }
    sendMessage({
      type: 'opening_mulligan_action',
      payload: actionPayload
    })
    if (removedCards.length > 0) {
      await new Promise((resolve) => setTimeout(resolve, OPENING_MULLIGAN_REMOVE_DELAY_MS))
    }
    await drawSequence(targetSize, {
      playerId,
      syncEachDraw: true,
      advancePhaseAfterDraw: false,
      delayMs: DRAW_DELAY_MS
    })
    return actionPayload
  }

  async function finishOpeningFlowIfReady() {
    const acceptedByPlayer = openingFlow.value.acceptedByPlayer
    const hasFinished = acceptedByPlayer.player_a && acceptedByPlayer.player_b
    if (!hasFinished) return false
    openingFlow.value.active = false
    emitOpeningMulliganState()
    sendMessage({
      type: 'opening_mulligan_done',
      payload: {}
    })
    return true
  }

  async function processOpeningActionAsHost(action, playerId) {
    if (!connection.isHost) return false
    if (!openingFlow.value.active) return false
    if (!isValidPlayerId(playerId)) return false
    if (action !== 'accept' && action !== 'mulligan') return false
    if (openingFlow.value.acceptedByPlayer[playerId]) return false

    if (action === 'accept') {
      openingFlow.value.acceptedByPlayer[playerId] = true
      sendMessage({
        type: 'opening_mulligan_action',
        payload: {
          action: 'accept',
          playerId,
          mulliganCount: openingFlow.value.mulliganCountByPlayer[playerId],
          newHandSize: players.players[playerId]?.hand?.length || 0
        }
      })
      emitOpeningMulliganState()
      await finishOpeningFlowIfReady()
      return true
    }

    openingFlow.value.mulliganCountByPlayer[playerId] += 1
    const targetSize = getOpeningHandTargetSize(playerId)
    await replaceOpeningHand(playerId, targetSize)
    emitOpeningMulliganState()
    return true
  }

  function enqueueOpeningActionAsHost(action, playerId) {
    openingHostActionChain = openingHostActionChain
      .catch(() => false)
      .then(() => processOpeningActionAsHost(action, playerId))
    return openingHostActionChain
  }

  async function acceptOpeningHand() {
    if (!openingFlow.value.active) return false
    if (openingFlow.value.acceptedByPlayer[myPlayerId.value]) return false
    if (openingActionPending.value) return false

    if (connection.isHost) {
      return enqueueOpeningActionAsHost('accept', myPlayerId.value)
    }

    openingActionPending.value = true
    const sent = sendMessage({
      type: 'opening_mulligan_action',
      payload: {
        action: 'accept',
        playerId: myPlayerId.value,
        requestedAt: Date.now()
      }
    })
    if (!sent) {
      openingActionPending.value = false
    }
    return sent
  }

  async function requestOpeningMulligan() {
    if (!openingFlow.value.active) return false
    if (openingFlow.value.acceptedByPlayer[myPlayerId.value]) return false
    if (openingActionPending.value) return false

    if (connection.isHost) {
      return enqueueOpeningActionAsHost('mulligan', myPlayerId.value)
    }

    openingActionPending.value = true
    const sent = sendMessage({
      type: 'opening_mulligan_action',
      payload: {
        action: 'mulligan',
        playerId: myPlayerId.value,
        requestedAt: Date.now()
      }
    })
    if (!sent) {
      openingActionPending.value = false
    }
    return sent
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

    if (data.type === 'opening_mulligan_action' && connection.isHost) {
      const action = data.payload?.action
      const playerId = data.payload?.playerId
      void enqueueOpeningActionAsHost(action, playerId)
      return true
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
    const devRoomId = import.meta.env.VITE_DEV_FIXED_ROOM_ID
    const roomId = route.query.id || (import.meta.env.DEV && devRoomId ? devRoomId : null)
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
    myPlayerId,
    isDrawing,
    openingFlow,
    openingActionPending,
    initGame,
    acceptOpeningHand,
    requestOpeningMulligan,
    requestRestartGame,
    incomingRestartRequest,
    respondRestartRequest,
    isRestartRequestPending,
    restartRequestStatus
  }
}
