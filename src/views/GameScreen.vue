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
import { onMounted } from 'vue'
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
import batchData from '@/../data/batches/batch-ce5e35aa-f0a3-426b-8eb6-239f51ba639b.json'

const route = useRoute()
const router = useRouter()

const connection = useConnectionStore()
const game = useGameStore()
const deck = useDeckStore()
const players = usePlayersStore()

function initGame() {
  // Load and shuffle deck
  deck.loadBatch(batchData)
  deck.shuffle()
  
  // Draw 7 cards for each player
  const playerACards = deck.draw(7)
  const playerBCards = deck.draw(7)
  
  players.addToHand('player_a', playerACards)
  players.addToHand('player_b', playerBCards)
  
  game.startGame()
  
  // Sync state with opponent
  sendMessage({
    type: 'game_init',
    payload: {
      deckCards: deck.cards,
      playerAHand: playerACards,
      playerBHand: playerBCards
    }
  })
}

function handleMessage(data) {
  console.log('[Game] Received:', data)
  
  if (data.type === 'game_init') {
    // Sync initial game state from host
    deck.loadBatch(batchData)
    deck.cards = data.payload.deckCards
    
    players.addToHand('player_a', data.payload.playerAHand)
    players.addToHand('player_b', data.payload.playerBHand)
    
    game.startGame()
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
</script>
