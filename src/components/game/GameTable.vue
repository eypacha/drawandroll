<template>
  <div class="game-table flex-1 flex flex-col items-center justify-center gap-4 p-8">
    <!-- Waiting state (pre-game) -->
    <div v-if="!connection.isConnected" class="waiting-state text-center">
      <p class="text-gray-500 text-lg font-light">Waiting for opponent...</p>
    </div>
    <div v-else-if="!game.isPlaying" class="text-center">
      <button 
        @click="$emit('start-game')"
        class="px-6 py-3 bg-gray-900 text-white text-sm tracking-wide hover:bg-gray-700 transition-colors"
      >
        Start Game
      </button>
    </div>
    <!-- Main play area (mesa) -->
    <div v-else class="main-table-area w-full flex flex-col items-center justify-center">
      <!-- Aquí se dividirán las secciones de la mesa (héroes, ítems, etc) -->
      <slot />
    </div>
  </div>
</template>

<script setup>
import { useConnectionStore, useGameStore } from '@/stores'

defineEmits(['start-game'])

const connection = useConnectionStore()
const game = useGameStore()
</script>

<style scoped>
.game-table {
  min-height: 400px;
  position: relative;
}
.waiting-state {
  padding: 2rem 0;
}
</style>
