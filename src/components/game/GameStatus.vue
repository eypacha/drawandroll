<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 p-8">
    <!-- Connection status -->
    <div class="flex items-center gap-2 text-xs uppercase tracking-widest">
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
    
    <!-- Pre-game state -->
    <div v-if="!game.isStarted" class="text-center">
      <p v-if="!connection.isConnected" class="text-gray-500">
        Waiting for opponent...
      </p>
      <button 
        v-else 
        @click="$emit('start-game')"
        class="px-6 py-3 bg-gray-900 text-white text-sm tracking-wide hover:bg-gray-700 transition-colors"
      >
        Start Game
      </button>
    </div>
    
    <!-- In-game state -->
    <div v-else class="text-center">
      <p class="text-lg font-light text-gray-700">
        {{ isMyTurn ? 'Your turn' : "Opponent's turn" }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useConnectionStore, useGameStore } from '@/stores'

defineEmits(['start-game'])

const connection = useConnectionStore()
const game = useGameStore()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const isMyTurn = computed(() => game.currentTurn === myPlayerId.value)
</script>
