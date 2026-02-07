<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-400 font-sans">
    <PreGameScreen v-if="!connection.isConnected" />
    <StartGameScreen 
      v-else-if="!game.isPlaying" 
      @start-game="initGame" 
    />
    <GameBoard v-else />
  </div>
</template>

<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  useConnectionStore, 
  useGameStore, 
  useDeckStore, 
  usePlayersStore 
} from '@/stores'
import { initPeer, connectToPeer, sendMessage, onMessage } from '@/services/peerService'

// Components
import PreGameScreen from '@/components/game/PreGameScreen.vue'
import StartGameScreen from '@/components/game/StartGameScreen.vue'
import GameBoard from '@/components/game/GameBoard.vue'

// Batch data
import batchData from '@/../data/batches/batch.json'

const route = useRoute()
const router = useRouter()

const connection = useConnectionStore()
const game = useGameStore()
const deck = useDeckStore()
const players = usePlayersStore()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const isDrawing = ref(false)
const DRAW_COUNT = 1
const DRAW_DELAY_MS = 350

function initGame() {
  if (!connection.isHost) {
    return
  }

  // Load and shuffle deck
  deck.loadBatch(batchData)
  deck.shuffle()
  
  // Draw 7 cards for each player
  const playerACards = deck.draw(7)
  const playerBCards = deck.draw(7)
  
  players.addToHand('player_a', playerACards)
  players.addToHand('player_b', playerBCards)
  
  // Turno inicial al azar
  const initialTurn = Math.random() < 0.5 ? 'player_a' : 'player_b'
  game.startGame(initialTurn)

  // Sync state with opponent
  sendMessage({
    type: 'game_init',
    payload: {
      deckCards: deck.cards,
      playerAHand: playerACards,
      playerBHand: playerBCards,
      initialTurn,
      turnPhase: game.turnPhase
    }
  })
}

function handleMessage(data) {
  console.log('[Game] Received:', data)
  
  if (data.type === 'game_init') {
    // Sync initial game state from host
    deck.loadBatch(batchData)
    deck.cards = data.payload.deckCards

    // Solo repartir cartas si aún no tienen 7
    if (players.players.player_a.hand.length === 0 && players.players.player_b.hand.length === 0) {
      players.addToHand('player_a', data.payload.playerAHand)
      players.addToHand('player_b', data.payload.playerBHand)
    }

    // Sincroniza turno inicial
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
  
  // If not connected yet, we're joining as guest
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

async function drawSequence() {
  if (isDrawing.value) return
  isDrawing.value = true

  for (let i = 0; i < DRAW_COUNT; i++) {
    const drawn = deck.draw(1)
    if (drawn.length === 0) break
    players.addToHand(myPlayerId.value, drawn)
    sendMessage({
      type: 'draw_card',
      payload: { playerId: myPlayerId.value, card: drawn[0] }
    })
    await new Promise((resolve) => setTimeout(resolve, DRAW_DELAY_MS))
  }

  isDrawing.value = false
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

watch(
  () => [game.turnPhase, game.currentTurn],
  ([phase, current]) => {
    if (phase === 'draw' && current === myPlayerId.value) {
      drawSequence()
    }
  }
)
</script>
