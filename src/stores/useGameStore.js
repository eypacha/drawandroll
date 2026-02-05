import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Game Store
 * Manages global game state: phases, turns, victory
 */
export const useGameStore = defineStore('game', () => {
  // State
  const phase = ref('setup') // 'setup' | 'playing' | 'ended'
  const currentTurn = ref('player_a') // 'player_a' | 'player_b'
  const turnPhase = ref('draw') // 'draw' | 'recruit' | 'equip' | 'combat' | 'end'
  const winner = ref(null) // null | 'player_a' | 'player_b'

  // Getters
  const isPlaying = computed(() => phase.value === 'playing')
  const isEnded = computed(() => phase.value === 'ended')

  // Actions
  function startGame() {
    phase.value = 'playing'
    currentTurn.value = 'player_a'
    turnPhase.value = 'draw'
    winner.value = null
  }

  function $reset() {
    phase.value = 'setup'
    currentTurn.value = 'player_a'
    turnPhase.value = 'draw'
    winner.value = null
  }

  return {
    // State
    phase,
    currentTurn,
    turnPhase,
    winner,
    // Getters
    isPlaying,
    isEnded,
    // Actions
    startGame,
    $reset
  }
})
