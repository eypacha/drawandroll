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
    heroes: [null, null, null], // 3 fixed slots
    resources: 5,
    maxResources: 5,
    heroesLost: 0,
    draggedCardId: null,
    hoveredCardId: null
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

  function playHeroFromHand(playerId, cardId, slotIndex = null) {
    const player = players.value[playerId]
    const heroCount = player.heroes.filter(Boolean).length
    if (heroCount >= 3) return null
    const index = player.hand.findIndex((card) => card.id === cardId)
    if (index === -1) return null
    const card = player.hand[index]
    if (card.type !== 'hero') return null
    const cost = getRecruitCost.value(playerId, card.cost)
    if (player.resources < cost) return null
    if (slotIndex !== null) {
      if (player.heroes[slotIndex]) return null
    } else {
      slotIndex = player.heroes.findIndex((slot) => !slot)
      if (slotIndex === -1) return null
    }
    player.resources -= cost
    player.hand.splice(index, 1)
    player.heroes[slotIndex] = { card, items: [] }
    return { card, cost, slotIndex }
  }

  function addHeroFromRemote(playerId, card, cost, slotIndex = null) {
    const player = players.value[playerId]
    const index = player.hand.findIndex((c) => c.id === card.id)
    if (index !== -1) {
      player.hand.splice(index, 1)
    }
    const heroCount = player.heroes.filter(Boolean).length
    if (heroCount >= 3) return false
    if (slotIndex !== null) {
      if (player.heroes[slotIndex]) return false
    } else {
      slotIndex = player.heroes.findIndex((slot) => !slot)
      if (slotIndex === -1) return false
    }
    if (typeof cost === 'number') {
      player.resources = Math.max(0, player.resources - cost)
    }
    player.heroes[slotIndex] = { card, items: [] }
    return true
  }

  function playItemFromHand(playerId, cardId, slotIndex) {
    const player = players.value[playerId]
    if (slotIndex === null || slotIndex === undefined) return null
    const hero = player.heroes[slotIndex]
    if (!hero) return null
    if (hero.items.length >= 3) return null
    const index = player.hand.findIndex((card) => card.id === cardId)
    if (index === -1) return null
    const card = player.hand[index]
    if (card.type !== 'item') return null
    const cost = card.cost
    if (player.resources < cost) return null
    player.resources -= cost
    player.hand.splice(index, 1)
    hero.items.push(card)
    return { card, cost, slotIndex }
  }

  function addItemFromRemote(playerId, card, cost, slotIndex) {
    const player = players.value[playerId]
    const hero = player.heroes[slotIndex]
    if (!hero) return false
    if (hero.items.length >= 3) return false
    const index = player.hand.findIndex((c) => c.id === card.id)
    if (index !== -1) {
      player.hand.splice(index, 1)
    }
    if (typeof cost === 'number') {
      player.resources = Math.max(0, player.resources - cost)
    }
    hero.items.push(card)
    return true
  }

  function setDraggedCard(playerId, cardId) {
    players.value[playerId].draggedCardId = cardId
  }

  function clearDraggedCard(playerId) {
    players.value[playerId].draggedCardId = null
  }

  function setHoveredCard(playerId, cardId) {
    players.value[playerId].hoveredCardId = cardId
  }

  function clearHoveredCard(playerId) {
    players.value[playerId].hoveredCardId = null
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
    playHeroFromHand,
    addHeroFromRemote,
    playItemFromHand,
    addItemFromRemote,
    setDraggedCard,
    clearDraggedCard,
    setHoveredCard,
    clearHoveredCard,
    refreshResources,
    $reset
  }
})
