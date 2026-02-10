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
  const firstTurnPlayer = ref('player_a') // player who starts the match
  const turnPhase = ref('draw') // 'draw' | 'recruit' | 'combat' | 'discard' | 'end'
  const winner = ref(null) // null | 'player_a' | 'player_b'

  // Getters
  const isPlaying = computed(() => phase.value === 'playing')
  const isEnded = computed(() => phase.value === 'ended')

  // Actions
  function createAdvanceResult(type, loser = null) {
    return {
      type,
      turn: turn.value,
      currentTurn: currentTurn.value,
      turnPhase: turnPhase.value,
      winner: winner.value,
      loser
    }
  }

  function getOpponentPlayerId(playerId) {
    return playerId === 'player_a' ? 'player_b' : 'player_a'
  }

  function getRequiredDiscardCount(playerId) {
    const handSize = players.players[playerId]?.hand?.length || 0
    return Math.max(0, handSize - 7)
  }

  function advanceToTurnEnd(playerId) {
    if (getRequiredDiscardCount(playerId) > 0) {
      turnPhase.value = 'discard'
      return createAdvanceResult('advanced')
    }
    return endTurn()
  }

  function startGame(initialTurn = 'player_a', initialTurnPhase = 'recruit') {
    phase.value = 'playing'
    turn.value = 1
    resources.value = {
      player_a: MAX_RESOURCES,
      player_b: MAX_RESOURCES
    }
    currentTurn.value = initialTurn
    firstTurnPlayer.value = initialTurn
    // First player skips draw phase on turn 1
    turnPhase.value = initialTurnPhase
    winner.value = null
    players.refreshResources(currentTurn.value)
  }

  function endGame(winnerPlayerId) {
    if (winnerPlayerId !== 'player_a' && winnerPlayerId !== 'player_b') return null
    phase.value = 'ended'
    turnPhase.value = 'end'
    winner.value = winnerPlayerId
    return createAdvanceResult('ended')
  }

  function advancePhase() {
    if (phase.value !== 'playing') return null
    if (turnPhase.value === 'draw') {
      turnPhase.value = 'recruit'
      return createAdvanceResult('advanced')
    }
    if (turnPhase.value === 'recruit') {
      // Only the very first player of the match skips combat once.
      if (turn.value === 1 && currentTurn.value === firstTurnPlayer.value) {
        return advanceToTurnEnd(currentTurn.value)
      }
      turnPhase.value = 'combat'
      players.resetCombatActions(currentTurn.value)
      return createAdvanceResult('advanced')
    }
    if (turnPhase.value === 'combat') {
      return advanceToTurnEnd(currentTurn.value)
    }
    if (turnPhase.value === 'discard') {
      if (getRequiredDiscardCount(currentTurn.value) > 0) return null
      return endTurn()
    }
    if (turnPhase.value === 'end') {
      return endTurn()
    }
    return null
  }

  function endTurn() {
    if (phase.value !== 'playing') return null
    const activePlayer = currentTurn.value
    const activeHeroes = players.players[activePlayer]?.heroes || []
    const hasHeroes = activeHeroes.some(Boolean)
    if (!hasHeroes) {
      const winnerPlayerId = getOpponentPlayerId(activePlayer)
      endGame(winnerPlayerId)
      const endedResult = createAdvanceResult('ended', activePlayer)
      return endedResult
    }

    players.resetCombatActions(activePlayer)
    currentTurn.value = currentTurn.value === 'player_a' ? 'player_b' : 'player_a'
    if (currentTurn.value === 'player_a') {
      turn.value += 1
    }
    turnPhase.value = 'draw'
    players.refreshResources(currentTurn.value)
    return createAdvanceResult('advanced')
  }

  function setTurnState(nextTurn, nextCurrent, nextPhase) {
    if (phase.value !== 'playing') return
    const previousCurrent = currentTurn.value
    turn.value = nextTurn
    currentTurn.value = nextCurrent
    turnPhase.value = nextPhase
    if (nextPhase === 'draw' && previousCurrent !== nextCurrent) {
      players.resetCombatActions(previousCurrent)
    }
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
    firstTurnPlayer.value = 'player_a'
    turnPhase.value = 'draw'
    winner.value = null
  }

  return {
    // State
    phase,
    resources,
    turn,
    currentTurn,
    firstTurnPlayer,
    turnPhase,
    winner,
    // Getters
    isPlaying,
    isEnded,
    // Actions
    startGame,
    getRequiredDiscardCount,
    advancePhase,
    endTurn,
    endGame,
    setTurnState,
    $reset
  }
})
