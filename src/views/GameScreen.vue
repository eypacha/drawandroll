<template>
  <div class="min-h-screen flex flex-col bg-white font-sans">
    <!-- Opponent's hand (card backs) -->
    <div class="p-4 bg-gray-50 border-b border-gray-100">
      <div class="flex justify-center gap-2 min-h-24">
        <div 
          v-for="(card, index) in opponentHand" 
          :key="card.id" 
          class="w-14 h-20 rounded border border-gray-300 bg-gray-200 flex items-center justify-center"
        >
          <span class="text-gray-400 text-lg">?</span>
        </div>
      </div>
      <p class="text-center text-xs uppercase tracking-widest text-gray-400 mt-2">
        Opponent ({{ opponentHand.length }} cards)
      </p>
    </div>

    <!-- Game info center -->
    <div class="flex-1 flex flex-col items-center justify-center gap-4 p-8">
      <div class="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400">
        <span 
          class="w-2 h-2 rounded-full"
          :class="{
            'bg-green-500': connection.status === 'connected',
            'bg-yellow-500': connection.status === 'connecting',
            'bg-gray-400': connection.status === 'disconnected'
          }"
        ></span>
        <span>{{ connection.role }}</span>
      </div>
      
      <div v-if="!gameStarted" class="text-center">
        <p v-if="!connection.isConnected" class="text-gray-500">
          Waiting for opponent...
        </p>
        <button 
          v-else 
          @click="initGame"
          class="px-6 py-3 bg-gray-900 text-white text-sm tracking-wide hover:bg-gray-700 transition-colors"
        >
          Start Game
        </button>
      </div>
      
      <div v-else class="text-center">
        <p class="text-lg font-light text-gray-700">
          {{ isMyTurn ? 'Your turn' : "Opponent's turn" }}
        </p>
      </div>
    </div>

    <!-- Player's hand (visible cards) -->
    <div class="p-4 bg-gray-50 border-t border-gray-100">
      <p class="text-center text-xs uppercase tracking-widest text-gray-400 mb-2">
        Your hand ({{ myHand.length }} cards)
      </p>
      <div class="flex justify-center gap-4 min-h-36">
        <Card v-for="(card, index) in myHand" :key="card.id" :card="card" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  useConnectionStore, 
  useGameStore, 
  useDeckStore, 
  usePlayersStore 
} from '@/stores'
import { initPeer, connectToPeer, sendMessage, onMessage } from '@/services/peerService'

// Import batch data

import batchData from '@/../data/batches/batch-ce5e35aa-f0a3-426b-8eb6-239f51ba639b.json'
import Card from '@/components/Card.vue'

const route = useRoute()
const router = useRouter()

const connection = useConnectionStore()
const game = useGameStore()
const deck = useDeckStore()
const players = usePlayersStore()

const gameStarted = ref(false)

// Determine which player I am based on role
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')

const myHand = computed(() => players.players[myPlayerId.value].hand)
const opponentHand = computed(() => players.players[opponentPlayerId.value].hand)

const isMyTurn = computed(() => game.currentTurn === myPlayerId.value)

function formatTemplate(template) {
  return template.replace(/_/g, ' ')
}

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
  gameStarted.value = true
  
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
    gameStarted.value = true
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
