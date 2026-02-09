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
    hoveredCardId: null,
    discardSelectionIds: [],
    mulliganRevealCards: []
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

  function getCardBaseHp(card) {
    const hp = Number(card?.stats?.hp || 0)
    return Math.max(1, hp)
  }

  function getHeroMaxHp(hero) {
    if (!hero?.card) return 0
    let maxHp = getCardBaseHp(hero.card)
    for (const item of hero.items || []) {
      const stats = item?.stats || {}
      if (typeof stats.hpBonus === 'number') maxHp += stats.hpBonus
      if (typeof stats.hpModifier === 'number') maxHp += stats.hpModifier
    }
    return Math.max(1, maxHp)
  }

  function ensureHeroState(hero) {
    if (!hero) return null
    const maxHp = getHeroMaxHp(hero)
    if (typeof hero.currentHp !== 'number') {
      hero.currentHp = maxHp
    }
    hero.currentHp = Math.max(0, Math.min(hero.currentHp, maxHp))
    if (typeof hero.hasAttackedThisPhase !== 'boolean') {
      hero.hasAttackedThisPhase = false
    }
    return hero
  }

  function getHeroCombatStats(hero) {
    const readyHero = ensureHeroState(hero)
    if (!readyHero) {
      return { atk: 0, def: 0, hp: 0, maxHp: 0 }
    }
    const baseStats = readyHero.card?.stats || {}
    let atk = Number(baseStats.atk || 0)
    let def = Number(baseStats.def || 0)
    for (const item of readyHero.items || []) {
      const stats = item?.stats || {}
      if (typeof stats.atkBonus === 'number') atk += stats.atkBonus
      if (typeof stats.atkModifier === 'number') atk += stats.atkModifier
      if (typeof stats.defBonus === 'number') def += stats.defBonus
      if (typeof stats.defModifier === 'number') def += stats.defModifier
    }
    const maxHp = getHeroMaxHp(readyHero)
    const hp = Math.max(0, Math.min(readyHero.currentHp, maxHp))
    return { atk, def, hp, maxHp }
  }

  function createHeroInstance(card) {
    return {
      card,
      items: [],
      currentHp: getCardBaseHp(card),
      hasAttackedThisPhase: false
    }
  }

  function createItemInstance(card) {
    const instance = { ...card }
    const durability = Number(card?.stats?.durability)
    if (Number.isFinite(durability) && durability > 0) {
      instance.currentDurability = durability
    }
    return instance
  }

  function getHeroAt(playerId, slotIndex) {
    const player = players.value[playerId]
    if (!player) return null
    return player.heroes[slotIndex] || null
  }

  // Actions
  function addToHand(playerId, cards) {
    players.value[playerId].hand.push(...cards)
  }

  function removeCardFromHand(playerId, cardId) {
    const player = players.value[playerId]
    if (!player || !cardId) return null
    const index = player.hand.findIndex((card) => card.id === cardId)
    if (index === -1) return null
    const [removed] = player.hand.splice(index, 1)
    removeDiscardSelectionCard(playerId, cardId)
    return removed || null
  }

  function removeDiscardSelectionCard(playerId, cardId) {
    const player = players.value[playerId]
    if (!player) return
    player.discardSelectionIds = player.discardSelectionIds.filter((id) => id !== cardId)
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
    removeDiscardSelectionCard(playerId, card.id)
    player.heroes[slotIndex] = createHeroInstance(card)
    return { card, cost, slotIndex }
  }

  function addHeroFromRemote(playerId, card, cost, slotIndex = null) {
    const player = players.value[playerId]
    const index = player.hand.findIndex((c) => c.id === card.id)
    if (index !== -1) {
      player.hand.splice(index, 1)
      removeDiscardSelectionCard(playerId, card.id)
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
    player.heroes[slotIndex] = createHeroInstance(card)
    return true
  }

  function playItemFromHand(playerId, cardId, slotIndex) {
    const player = players.value[playerId]
    if (slotIndex === null || slotIndex === undefined) return null
    const hero = ensureHeroState(player.heroes[slotIndex])
    if (!hero) return null
    if (hero.items.length >= 3) return null
    const index = player.hand.findIndex((card) => card.id === cardId)
    if (index === -1) return null
    const card = player.hand[index]
    if (card.type !== 'item') return null
    const cost = card.cost
    if (player.resources < cost) return null
    const maxHpBefore = getHeroMaxHp(hero)
    player.resources -= cost
    player.hand.splice(index, 1)
    removeDiscardSelectionCard(playerId, card.id)
    hero.items.push(createItemInstance(card))
    const maxHpAfter = getHeroMaxHp(hero)
    if (maxHpAfter > maxHpBefore) {
      hero.currentHp += maxHpAfter - maxHpBefore
    }
    hero.currentHp = Math.max(0, Math.min(hero.currentHp, maxHpAfter))
    return { card, cost, slotIndex }
  }

  function addItemFromRemote(playerId, card, cost, slotIndex) {
    const player = players.value[playerId]
    const hero = ensureHeroState(player.heroes[slotIndex])
    if (!hero) return false
    if (hero.items.length >= 3) return false
    const index = player.hand.findIndex((c) => c.id === card.id)
    if (index !== -1) {
      player.hand.splice(index, 1)
      removeDiscardSelectionCard(playerId, card.id)
    }
    const maxHpBefore = getHeroMaxHp(hero)
    if (typeof cost === 'number') {
      player.resources = Math.max(0, player.resources - cost)
    }
    hero.items.push(createItemInstance(card))
    const maxHpAfter = getHeroMaxHp(hero)
    if (maxHpAfter > maxHpBefore) {
      hero.currentHp += maxHpAfter - maxHpBefore
    }
    hero.currentHp = Math.max(0, Math.min(hero.currentHp, maxHpAfter))
    return true
  }

  function canHeroAttack(playerId, slotIndex) {
    const hero = ensureHeroState(getHeroAt(playerId, slotIndex))
    if (!hero) return false
    if (hero.currentHp <= 0) return false
    return !hero.hasAttackedThisPhase
  }

  function resetCombatActions(playerId) {
    const player = players.value[playerId]
    if (!player) return
    for (const hero of player.heroes) {
      if (!hero) continue
      ensureHeroState(hero)
      hero.hasAttackedThisPhase = false
    }
  }

  function applyCombatResult(payload) {
    const {
      attackerPlayerId,
      attackerSlot,
      defenderPlayerId,
      defenderSlot,
      damage = 0,
      defenderHpAfter = null,
      defenderDefeated = false
    } = payload || {}

    const attackerHero = ensureHeroState(getHeroAt(attackerPlayerId, attackerSlot))
    if (attackerHero) {
      attackerHero.hasAttackedThisPhase = true
    }

    const defenderPlayer = players.value[defenderPlayerId]
    if (!defenderPlayer) return false

    const defenderHero = ensureHeroState(getHeroAt(defenderPlayerId, defenderSlot))
    if (!defenderHero) return false

    if (defenderDefeated) {
      defenderPlayer.heroes[defenderSlot] = null
      defenderPlayer.heroesLost += 1
      return true
    }

    const maxHp = getHeroMaxHp(defenderHero)
    const fallbackHp = defenderHero.currentHp - Math.max(0, Number(damage) || 0)
    const nextHp = typeof defenderHpAfter === 'number' ? defenderHpAfter : fallbackHp
    defenderHero.currentHp = Math.max(0, Math.min(nextHp, maxHp))

    if (defenderHero.currentHp <= 0) {
      defenderPlayer.heroes[defenderSlot] = null
      defenderPlayer.heroesLost += 1
    }

    return true
  }

  function resolveCombatAsHost({
    attackerPlayerId,
    attackerSlot,
    defenderPlayerId,
    defenderSlot,
    attackerRoll,
    defenderRoll,
    criticalBonus = 2
  }) {
    const attackerHero = ensureHeroState(getHeroAt(attackerPlayerId, attackerSlot))
    const defenderHero = ensureHeroState(getHeroAt(defenderPlayerId, defenderSlot))
    if (!attackerHero || !defenderHero) return null
    if (!canHeroAttack(attackerPlayerId, attackerSlot)) return null

    const attackerStats = getHeroCombatStats(attackerHero)
    const defenderStats = getHeroCombatStats(defenderHero)
    const safeAttackerRoll = Number(attackerRoll) || 0
    const safeDefenderRoll = Number(defenderRoll) || 0

    let damage = Math.max(0, attackerStats.atk + safeAttackerRoll - (defenderStats.def + safeDefenderRoll))
    const isFumble = safeAttackerRoll === 1
    const isCritical = safeAttackerRoll === 20
    if (isFumble) {
      damage = 0
    } else if (isCritical) {
      damage += criticalBonus
    }

    const defenderHpBefore = defenderStats.hp
    const defenderHpAfter = Math.max(0, defenderHpBefore - damage)
    const defenderDefeated = defenderHpAfter <= 0

    const result = {
      attackerPlayerId,
      attackerSlot,
      defenderPlayerId,
      defenderSlot,
      attackerRoll: safeAttackerRoll,
      defenderRoll: safeDefenderRoll,
      attackerTotal: attackerStats.atk + safeAttackerRoll,
      defenderTotal: defenderStats.def + safeDefenderRoll,
      damage,
      isCritical,
      isFumble,
      defenderHpBefore,
      defenderHpAfter,
      defenderDefeated
    }

    applyCombatResult(result)
    return result
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

  function setMulliganReveal(playerId, cards) {
    const player = players.value[playerId]
    if (!player) return false
    player.mulliganRevealCards = Array.isArray(cards) ? cards.map((card) => ({ ...card })) : []
    return true
  }

  function removeMulliganRevealCard(playerId, cardId) {
    const player = players.value[playerId]
    if (!player) return false
    player.mulliganRevealCards = player.mulliganRevealCards.filter((card) => card.id !== cardId)
    return true
  }

  function clearMulliganReveal(playerId) {
    const player = players.value[playerId]
    if (!player) return false
    player.mulliganRevealCards = []
    return true
  }

  function toggleDiscardSelection(playerId, cardId) {
    const player = players.value[playerId]
    if (!player || !cardId) return false
    if (!player.hand.some((card) => card.id === cardId)) return false
    if (player.discardSelectionIds.includes(cardId)) {
      player.discardSelectionIds = player.discardSelectionIds.filter((id) => id !== cardId)
      return true
    }
    player.discardSelectionIds = [...player.discardSelectionIds, cardId]
    return true
  }

  function clearDiscardSelection(playerId) {
    const player = players.value[playerId]
    if (!player) return
    player.discardSelectionIds = []
  }

  function discardFromHand(playerId, cardIds) {
    const player = players.value[playerId]
    if (!player || !Array.isArray(cardIds) || cardIds.length === 0) return []
    const uniqueIds = [...new Set(cardIds)].filter(Boolean)
    const handById = new Map(player.hand.map((card) => [card.id, card]))
    const discardedCards = []
    for (const cardId of uniqueIds) {
      const card = handById.get(cardId)
      if (!card) return []
      discardedCards.push(card)
    }
    if (discardedCards.length !== uniqueIds.length) return []
    const selectedSet = new Set(uniqueIds)
    player.hand = player.hand.filter((card) => !selectedSet.has(card.id))
    player.discardSelectionIds = player.discardSelectionIds.filter((id) => !selectedSet.has(id))
    return discardedCards
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
    removeCardFromHand,
    playHeroFromHand,
    addHeroFromRemote,
    playItemFromHand,
    addItemFromRemote,
    getHeroCombatStats,
    canHeroAttack,
    resetCombatActions,
    applyCombatResult,
    resolveCombatAsHost,
    setDraggedCard,
    clearDraggedCard,
    setHoveredCard,
    clearHoveredCard,
    setMulliganReveal,
    removeMulliganRevealCard,
    clearMulliganReveal,
    toggleDiscardSelection,
    clearDiscardSelection,
    discardFromHand,
    refreshResources,
    $reset
  }
})
