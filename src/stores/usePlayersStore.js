import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Players Store
 * Manages both players: hands, heroes on board, resources, pressure
 */
export const usePlayersStore = defineStore('players', () => {
  // Initial player state factory
  const createPlayer = () => ({
    hand: [],
    heroes: [], // max 3
    resources: 5,
    maxResources: 5,
    heroesLost: 0
  })

  // State
  const players = ref({
    player_a: createPlayer(),
    player_b: createPlayer()
  })

  // Getters
  const getPlayer = computed(() => (id) => players.value[id])
  
  const getRecruitCost = computed(() => (playerId, baseCost) => {
    const lost = players.value[playerId].heroesLost
    // Pressure system: +1, +2, +3... for each hero lost
    const pressure = (lost * (lost + 1)) / 2
    return baseCost + pressure
  })

  // Actions
  function addToHand(playerId, cards) {
    players.value[playerId].hand.push(...cards)
  }

  function refreshResources(playerId) {
    players.value[playerId].resources = players.value[playerId].maxResources
  }

  function $reset() {
    players.value = {
      player_a: createPlayer(),
      player_b: createPlayer()
    }
  }

  return {
    // State
    players,
    // Getters
    getPlayer,
    getRecruitCost,
    // Actions
    addToHand,
    refreshResources,
    $reset
  }
})
