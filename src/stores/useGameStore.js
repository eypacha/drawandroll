import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { usePlayersStore } from './usePlayersStore'


const MAX_RESOURCES = 10

/**
 * Game Store
 * Manages global game state: phases, turns, victory
 */
export const useGameStore = defineStore('game', () => {
  const players = usePlayersStore()
  // State
  const phase = ref('setup') // 'setup' | 'playing' | 'ended'
  const turn = ref(0)
  const resources = ref({
    player_a: MAX_RESOURCES,
    player_b: MAX_RESOURCES
  })
  const currentTurn = ref('player_a') // 'player_a' | 'player_b'
  const turnPhase = ref('draw') // 'draw' | 'recruit' | 'combat' | 'end'
  const winner = ref(null) // null | 'player_a' | 'player_b'

  // Getters
  const isPlaying = computed(() => phase.value === 'playing')
  const isEnded = computed(() => phase.value === 'ended')

  // Actions
  function startGame(initialTurn = 'player_a', initialTurnPhase = 'recruit') {
    phase.value = 'playing'
    turn.value = 1
    resources.value = {
      player_a: MAX_RESOURCES,
      player_b: MAX_RESOURCES
    }
    currentTurn.value = initialTurn
    // First player skips draw phase on turn 1
    turnPhase.value = initialTurnPhase
    winner.value = null
    players.refreshResources(currentTurn.value)
  }

  function advancePhase() {
    if (phase.value !== 'playing') return
    if (turnPhase.value === 'draw') {
      turnPhase.value = 'recruit'
      return
    }
    if (turnPhase.value === 'recruit') {
      if (turn.value === 1) {
        turnPhase.value = 'end'
        return
      }
      turnPhase.value = 'combat'
      players.resetCombatActions(currentTurn.value)
      return
    }
    if (turnPhase.value === 'combat') {
      turnPhase.value = 'end'
      return
    }
    if (turnPhase.value === 'end') {
      endTurn()
    }
  }

  function endTurn() {
    currentTurn.value = currentTurn.value === 'player_a' ? 'player_b' : 'player_a'
    if (currentTurn.value === 'player_a') {
      turn.value += 1
    }
    turnPhase.value = 'draw'
    players.refreshResources(currentTurn.value)
  }

  function setTurnState(nextTurn, nextCurrent, nextPhase) {
    turn.value = nextTurn
    currentTurn.value = nextCurrent
    turnPhase.value = nextPhase
    if (nextPhase === 'combat') {
      players.resetCombatActions(nextCurrent)
    }
    if (nextPhase === 'draw') {
      players.refreshResources(nextCurrent)
    }
  }

  function $reset() {
    phase.value = 'setup'
    turn.value = 0
    resources.value = {
      player_a: MAX_RESOURCES,
      player_b: MAX_RESOURCES
    }
    currentTurn.value = 'player_a'
    turnPhase.value = 'draw'
    winner.value = null
  }

  return {
    // State
    phase,
    resources,
    turn,
    currentTurn,
    turnPhase,
    winner,
    // Getters
    isPlaying,
    isEnded,
    // Actions
    startGame,
    advancePhase,
    endTurn,
    setTurnState,
    $reset
  }
})
