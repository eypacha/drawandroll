import { onMounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  useConnectionStore,
  useGameStore,
  useDeckStore,
  usePlayersStore
} from '@/stores'
import { initPeer, connectToPeer, sendMessage, onMessage } from '@/services/peerService'
import batchData from '@/../data/batches/batch.json'

const DRAW_DELAY_MS = 350

export function useGameSession() {
  const route = useRoute()
  const router = useRouter()

  const connection = useConnectionStore()
  const game = useGameStore()
  const deck = useDeckStore()
  const players = usePlayersStore()
  const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
  const isDrawing = ref(false)

  async function initGame() {
    if (!connection.isHost) {
      return
    }

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

    await drawSequence(7, {
      playerId: 'player_a',
      syncEachDraw: true,
      advancePhaseAfterDraw: false,
      delayMs: DRAW_DELAY_MS
    })
    await drawSequence(7, {
      playerId: 'player_b',
      syncEachDraw: true,
      advancePhaseAfterDraw: false,
      delayMs: DRAW_DELAY_MS
    })
  }

  function handleMessage(data) {
    console.log('[Game] Received:', data)

    if (data.type === 'game_init') {
      deck.loadBatch(batchData)
      deck.cards = data.payload.deckCards
      const initialTurnPhase = data.payload.turnPhase || 'recruit'
      game.startGame(data.payload.initialTurn, initialTurnPhase)
    }

    if (data.type === 'recruit_hero') {
      const { playerId, card, cost, slotIndex } = data.payload
      players.addHeroFromRemote(playerId, card, cost, slotIndex)
    }

    if (data.type === 'equip_item') {
      const { playerId, card, cost, slotIndex } = data.payload
      players.addItemFromRemote(playerId, card, cost, slotIndex)
    }

    if (data.type === 'advance_phase') {
      const { turn, currentTurn, turnPhase } = data.payload
      game.setTurnState(turn, currentTurn, turnPhase)
    }

    if (data.type === 'draw_card') {
      const { playerId, card } = data.payload
      deck.removeCardById(card.id)
      players.addToHand(playerId, [card])
    }

    if (data.type === 'hover_card') {
      const { playerId, cardId } = data.payload
      if (cardId) {
        players.setHoveredCard(playerId, cardId)
      } else {
        players.clearHoveredCard(playerId)
      }
    }
  }

  onMounted(() => {
    const roomId = route.query.id
    if (!roomId) {
      router.push({ name: 'Main' })
      return
    }

    onMessage(handleMessage)

    if (!connection.isConnected) {
      initPeer()

      const waitForReady = setInterval(() => {
        if (connection.isReady) {
          clearInterval(waitForReady)
          connectToPeer(roomId)

          const waitForConnect = setInterval(() => {
            if (connection.isConnected) {
              clearInterval(waitForConnect)
              sendMessage({ type: 'join', payload: { peerId: connection.peerId } })
            }
          }, 100)
        }
      }, 100)
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
    const drawnCards = []

    for (let i = 0; i < drawCount; i++) {
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

    if (advancePhaseAfterDraw) {
      game.advancePhase()
      sendMessage({
        type: 'advance_phase',
        payload: {
          turn: game.turn,
          currentTurn: game.currentTurn,
          turnPhase: game.turnPhase
        }
      })
    }

    return drawnCards
  }

  watch(
    () => [game.turnPhase, game.currentTurn],
    ([phase, current]) => {
      if (phase === 'draw' && current === myPlayerId.value) {
        drawSequence(1)
      }
    }
  )

  return {
    connection,
    game,
    initGame
  }
}
