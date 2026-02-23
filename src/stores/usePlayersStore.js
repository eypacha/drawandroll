import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Players Store
 * Manages both players: hands, heroes on board, resources, pressure
 */
export const usePlayersStore = defineStore('players', () => {
  const DEFAULT_MAX_RESOURCES = 6

  // Initial player state factory
  const createPlayer = () => ({
    hand: [],
    heroes: [null, null, null], // 3 fixed slots
    resources: DEFAULT_MAX_RESOURCES,
    maxResources: DEFAULT_MAX_RESOURCES,
    heroesLost: 0,
    draggedCardId: null,
    hoveredCardId: null,
    discardSelectionIds: [],
    hiddenHandCardIds: [],
    mulliganRevealCards: [],
    pendingHealingCardId: null
  })

  // State
  const players = ref({
    player_a: createPlayer(),
    player_b: createPlayer()
  })

  // Getters
  const getPlayer = computed(() => (id) => players.value[id])
  
  const getRecruitCost = computed(() => (playerId, baseCost) => {
    return Number(baseCost || 0)
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
    if (typeof hero.summoningSick !== 'boolean') {
      hero.summoningSick = false
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
      hasAttackedThisPhase: false,
      summoningSick: true
    }
  }

  function createItemInstance(card) {
    return { ...card }
  }

  function getHeroAt(playerId, slotIndex) {
    const player = players.value[playerId]
    if (!player) return null
    return player.heroes[slotIndex] || null
  }

  function toValidSlotIndex(slotIndex) {
    const parsed = Number(slotIndex)
    if (!Number.isInteger(parsed)) return null
    if (parsed < 0 || parsed > 2) return null
    return parsed
  }

  function canHealTarget(playerId, slotIndex) {
    const safeSlotIndex = toValidSlotIndex(slotIndex)
    if (safeSlotIndex === null) return false
    const hero = ensureHeroState(getHeroAt(playerId, safeSlotIndex))
    if (!hero) return false
    if (hero.currentHp <= 0) return false
    const maxHp = getHeroMaxHp(hero)
    return hero.currentHp < maxHp
  }

  function getHealingTargets(playerId) {
    const player = players.value[playerId]
    if (!player) return []
    const targets = []
    for (let slotIndex = 0; slotIndex < player.heroes.length; slotIndex += 1) {
      if (canHealTarget(playerId, slotIndex)) targets.push(slotIndex)
    }
    return targets
  }

  function healHeroAtSlot(playerId, slotIndex, healAmount) {
    const safeSlotIndex = toValidSlotIndex(slotIndex)
    if (safeSlotIndex === null) return null
    const hero = ensureHeroState(getHeroAt(playerId, safeSlotIndex))
    if (!hero || hero.currentHp <= 0) return null
    const maxHp = getHeroMaxHp(hero)
    const amount = Math.max(0, Number(healAmount) || 0)
    const hpBefore = hero.currentHp
    const hpAfter = Math.max(0, Math.min(maxHp, hpBefore + amount))
    const appliedHeal = Math.max(0, hpAfter - hpBefore)
    if (appliedHeal <= 0) return null
    hero.currentHp = hpAfter
    return {
      slotIndex: safeSlotIndex,
      hpBefore,
      hpAfter,
      appliedHeal
    }
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
    if (player.pendingHealingCardId === cardId) {
      player.pendingHealingCardId = null
    }
    unhideHandCard(playerId, cardId)
    return removed || null
  }

  function hideHandCard(playerId, cardId) {
    const player = players.value[playerId]
    if (!player || !cardId) return false
    if (!player.hand.some((card) => card.id === cardId)) return false
    if (player.hiddenHandCardIds.includes(cardId)) return true
    player.hiddenHandCardIds = [...player.hiddenHandCardIds, cardId]
    return true
  }

  function unhideHandCard(playerId, cardId) {
    const player = players.value[playerId]
    if (!player || !cardId) return false
    const prevLength = player.hiddenHandCardIds.length
    player.hiddenHandCardIds = player.hiddenHandCardIds.filter((id) => id !== cardId)
    return player.hiddenHandCardIds.length !== prevLength
  }

  function clearHiddenHandCards(playerId) {
    const player = players.value[playerId]
    if (!player) return false
    player.hiddenHandCardIds = []
    return true
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

  function playHealingFromHand(playerId, cardId, targetSlot) {
    const player = players.value[playerId]
    if (!player) return null
    const safeTargetSlot = toValidSlotIndex(targetSlot)
    if (safeTargetSlot === null) return null

    const handIndex = player.hand.findIndex((card) => card.id === cardId)
    if (handIndex === -1) return null
    const card = player.hand[handIndex]
    if (card?.type !== 'healing') return null

    const cost = Number(card.cost || 0)
    if (player.resources < cost) return null
    if (!canHealTarget(playerId, safeTargetSlot)) return null

    const healAmount = Math.max(0, Number(card?.stats?.healAmount || 0))
    const healResult = healHeroAtSlot(playerId, safeTargetSlot, healAmount)
    if (!healResult || healResult.appliedHeal <= 0) return null

    player.resources = Math.max(0, player.resources - cost)
    player.hand.splice(handIndex, 1)
    removeDiscardSelectionCard(playerId, card.id)
    if (player.pendingHealingCardId === card.id) {
      player.pendingHealingCardId = null
    }

    return {
      card,
      cost,
      targetSlot: safeTargetSlot,
      healAmount,
      ...healResult
    }
  }

  function addHealingFromRemote(playerId, card, cost, targetSlot, appliedHeal, hpBefore, hpAfter) {
    const player = players.value[playerId]
    if (!player) return false
    const safeTargetSlot = toValidSlotIndex(targetSlot)
    if (safeTargetSlot === null) return false

    const handIndex = player.hand.findIndex((entry) => entry.id === card?.id)
    if (handIndex !== -1) {
      player.hand.splice(handIndex, 1)
      removeDiscardSelectionCard(playerId, card.id)
      if (player.pendingHealingCardId === card.id) {
        player.pendingHealingCardId = null
      }
    }

    const hero = ensureHeroState(player.heroes[safeTargetSlot])
    if (!hero || hero.currentHp <= 0) return false

    if (typeof cost === 'number') {
      player.resources = Math.max(0, player.resources - cost)
    }

    const maxHp = getHeroMaxHp(hero)
    if (typeof hpBefore === 'number') {
      hero.currentHp = Math.max(0, Math.min(hpBefore, maxHp))
    }

    if (typeof hpAfter === 'number') {
      hero.currentHp = Math.max(0, Math.min(hpAfter, maxHp))
      return true
    }

    const healAmount = Math.max(0, Number(appliedHeal) || 0)
    hero.currentHp = Math.max(0, Math.min(hero.currentHp + healAmount, maxHp))
    return true
  }

  function canHeroAttack(playerId, slotIndex) {
    const hero = ensureHeroState(getHeroAt(playerId, slotIndex))
    if (!hero) return false
    if (hero.currentHp <= 0) return false
    if (hero.summoningSick) return false
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

  function clearSummoningSickness(playerId) {
    const player = players.value[playerId]
    if (!player) return
    for (const hero of player.heroes) {
      if (!hero) continue
      ensureHeroState(hero)
      hero.summoningSick = false
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
      defenderDefeated = false,
      reactions = [],
      attackerHpAfter = null,
      attackerDefeated = false
    } = payload || {}

    const attackerHero = ensureHeroState(getHeroAt(attackerPlayerId, attackerSlot))
    if (attackerHero) {
      attackerHero.hasAttackedThisPhase = true
    }

    const defenderPlayer = players.value[defenderPlayerId]
    if (!defenderPlayer) return false

    if (Array.isArray(reactions)) {
      for (const reaction of reactions) {
        if (!reaction?.cardId) continue
        removeCardFromHand(defenderPlayerId, reaction.cardId)
        if (reaction.type === 'healing') {
          const targetSlot = toValidSlotIndex(reaction.targetSlot)
          if (targetSlot !== null) {
            const hero = ensureHeroState(getHeroAt(defenderPlayerId, targetSlot))
            if (hero && hero.currentHp > 0) {
              const maxHp = getHeroMaxHp(hero)
              if (typeof reaction.hpBefore === 'number') {
                hero.currentHp = Math.max(0, Math.min(reaction.hpBefore, maxHp))
              }
              if (typeof reaction.hpAfter === 'number') {
                hero.currentHp = Math.max(0, Math.min(reaction.hpAfter, maxHp))
              } else if (typeof reaction.appliedHeal === 'number') {
                hero.currentHp = Math.max(0, Math.min(hero.currentHp + reaction.appliedHeal, maxHp))
              }
            }
          }
        }
      }
      const lastReaction = reactions[reactions.length - 1]
      if (typeof lastReaction?.resourcesAfter === 'number') {
        defenderPlayer.resources = Math.max(0, lastReaction.resourcesAfter)
      }
    }

    const defenderHero = ensureHeroState(getHeroAt(defenderPlayerId, defenderSlot))
    if (!defenderHero) return false

    const attackerPlayer = players.value[attackerPlayerId]
    if (attackerPlayer) {
      const attackerHero = ensureHeroState(getHeroAt(attackerPlayerId, attackerSlot))
      if (attackerHero) {
        if (attackerDefeated) {
          attackerPlayer.heroes[attackerSlot] = null
          attackerPlayer.heroesLost += 1
        } else if (typeof attackerHpAfter === 'number') {
          const attackerMaxHp = getHeroMaxHp(attackerHero)
          attackerHero.currentHp = Math.max(0, Math.min(attackerHpAfter, attackerMaxHp))
          if (attackerHero.currentHp <= 0) {
            attackerPlayer.heroes[attackerSlot] = null
            attackerPlayer.heroesLost += 1
          }
        }
      }
    }

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

  function applyReactiveEffect({ card, damage, isCritical, criticalBonus, defenderHpBefore }) {
    const effect = card?.effect
    const next = {
      damage,
      isCritical,
      criticalCanceled: false,
      preventedDeath: false
    }

    if (effect === 'reduce_damage') {
      const reduction = Math.max(0, Number(card?.stats?.damageReduction) || 0)
      if (reduction > 0 && next.damage > 0) {
        next.damage = Math.max(0, next.damage - reduction)
      }
      return next
    }

    if (effect === 'cancel_critical') {
      if (next.isCritical && criticalBonus > 0 && next.damage > 0) {
        next.damage = Math.max(0, next.damage - criticalBonus)
        next.isCritical = false
        next.criticalCanceled = true
      }
      return next
    }

    if (effect === 'prevent_death') {
      if (next.damage >= defenderHpBefore) {
        next.damage = Math.max(0, defenderHpBefore - 1)
        next.preventedDeath = true
      }
      return next
    }

    return next
  }

  function getPlayableReactiveCards(defenderPlayerId) {
    const defenderPlayer = players.value[defenderPlayerId]
    if (!defenderPlayer) return []
    return defenderPlayer.hand.filter((card) => (
      (
        card?.type === 'reactive' ||
        card?.type === 'counterattack' ||
        (card?.type === 'healing' && getHealingTargets(defenderPlayerId).length > 0)
      ) &&
      defenderPlayer.resources >= Number(card?.cost || 0)
    ))
  }

  function resolveCombatAsHost({
    attackerPlayerId,
    attackerSlot,
    defenderPlayerId,
    defenderSlot,
    attackerRoll,
    defenderRoll,
    criticalBonus = 3,
    reactionActions = [],
    rollCounterAttack = null,
    rollCounterDefense = null
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
    let isCritical = safeAttackerRoll === 20
    if (isFumble) {
      damage = 0
    } else if (isCritical) {
      damage += criticalBonus
    }

    const defenderHpBefore = defenderStats.hp
    const reactions = []
    let counterDamageTotal = 0
    let reactionUsed = false
    let counterattackUsed = false
    const safeCounterAttackRoll = typeof rollCounterAttack === 'function'
      ? rollCounterAttack
      : () => Math.floor(Math.random() * 20) + 1
    const safeCounterDefenseRoll = typeof rollCounterDefense === 'function'
      ? rollCounterDefense
      : () => Math.floor(Math.random() * 20) + 1

    const defenderPlayer = players.value[defenderPlayerId]
    if (Array.isArray(reactionActions) && defenderPlayer) {
      for (const action of reactionActions) {
        if (reactionUsed) break
        const reactionCardId = action?.cardId
        if (!reactionCardId) continue
        const reactionCard = defenderPlayer.hand.find((card) => card?.id === reactionCardId)
        if (!reactionCard) continue

        const reactionType = reactionCard.type
        if (reactionType !== 'reactive' && reactionType !== 'counterattack' && reactionType !== 'healing') continue
        const cost = Number(reactionCard.cost || 0)
        if (defenderPlayer.resources < cost) continue

        if (reactionType === 'reactive') {
          const damageBeforeReactive = damage
          const appliedReactive = applyReactiveEffect({
            card: reactionCard,
            damage,
            isCritical,
            criticalBonus,
            defenderHpBefore
          })
          damage = appliedReactive.damage
          isCritical = appliedReactive.isCritical
          removeCardFromHand(defenderPlayerId, reactionCard.id)
          defenderPlayer.resources = Math.max(0, defenderPlayer.resources - cost)
          reactions.push({
            type: 'reactive',
            cardId: reactionCard.id,
            effect: reactionCard.effect,
            cost,
            resourcesAfter: defenderPlayer.resources,
            damageReduction: Math.max(0, damageBeforeReactive - damage),
            criticalCanceled: Boolean(appliedReactive.criticalCanceled),
            preventedDeath: Boolean(appliedReactive.preventedDeath)
          })
          reactionUsed = true
          continue
        }

        if (reactionType === 'healing') {
          const targetSlot = toValidSlotIndex(action?.targetSlot)
          if (targetSlot === null) continue
          const healAmount = Math.max(0, Number(reactionCard?.stats?.healAmount || 0))
          const healResult = healHeroAtSlot(defenderPlayerId, targetSlot, healAmount)
          if (!healResult || healResult.appliedHeal <= 0) continue
          removeCardFromHand(defenderPlayerId, reactionCard.id)
          defenderPlayer.resources = Math.max(0, defenderPlayer.resources - cost)
          reactions.push({
            type: 'healing',
            cardId: reactionCard.id,
            cost,
            resourcesAfter: defenderPlayer.resources,
            targetSlot,
            healAmount,
            appliedHeal: healResult.appliedHeal,
            hpBefore: healResult.hpBefore,
            hpAfter: healResult.hpAfter
          })
          reactionUsed = true
          continue
        }

        if (counterattackUsed) continue
        const counterDamage = Math.max(0, Number(reactionCard?.stats?.counterDamage || 0))
        const counterAttackRoll = safeCounterAttackRoll()
        const counterDefenseRoll = safeCounterDefenseRoll()
        const isCounterFumble = counterAttackRoll === 1
        const isCounterCritical = counterAttackRoll === 20
        let counterFinal = Math.max(
          0,
          (counterDamage + counterAttackRoll) - (attackerStats.def + counterDefenseRoll)
        )
        if (isCounterFumble) {
          counterFinal = 0
        } else if (isCounterCritical) {
          counterFinal += criticalBonus
        }
        counterDamageTotal += counterFinal
        counterattackUsed = true
        removeCardFromHand(defenderPlayerId, reactionCard.id)
        defenderPlayer.resources = Math.max(0, defenderPlayer.resources - cost)
        reactions.push({
          type: 'counterattack',
          cardId: reactionCard.id,
          cost,
          resourcesAfter: defenderPlayer.resources,
          counterDamage,
          counterAttackRoll,
          counterDefenseRoll,
          counterFinal,
          isCounterCritical,
          isCounterFumble
        })
        reactionUsed = true
      }
    }

    const defenderHeroAfterReaction = ensureHeroState(getHeroAt(defenderPlayerId, defenderSlot))
    const defenderEffectiveHpBefore = defenderHeroAfterReaction
      ? getHeroCombatStats(defenderHeroAfterReaction).hp
      : defenderHpBefore
    const defenderHpAfter = Math.max(0, defenderEffectiveHpBefore - damage)
    const defenderDefeated = defenderHpAfter <= 0
    const attackerHpBefore = attackerStats.hp
    const attackerHpAfter = Math.max(0, attackerHpBefore - counterDamageTotal)
    const attackerDefeated = attackerHpAfter <= 0

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
      counterDamageTotal,
      isCritical,
      isFumble,
      attackerHpBefore,
      attackerHpAfter,
      attackerDefeated,
      defenderHpBefore,
      defenderHpAfter,
      defenderDefeated,
      reactions
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

  function setPendingHealingCard(playerId, cardId) {
    const player = players.value[playerId]
    if (!player) return false
    if (!cardId) {
      player.pendingHealingCardId = null
      return true
    }
    const card = player.hand.find((entry) => entry.id === cardId)
    if (!card || card.type !== 'healing') return false
    player.pendingHealingCardId = cardId
    return true
  }

  function clearPendingHealingCard(playerId) {
    const player = players.value[playerId]
    if (!player) return false
    player.pendingHealingCardId = null
    return true
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
    player.hiddenHandCardIds = player.hiddenHandCardIds.filter((id) => !selectedSet.has(id))
    return discardedCards
  }

  function refreshResources(playerId) {
    const player = players.value[playerId]
    if (!player) return
    player.maxResources = DEFAULT_MAX_RESOURCES
    player.resources = player.maxResources
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
    hideHandCard,
    unhideHandCard,
    clearHiddenHandCards,
    playHeroFromHand,
    addHeroFromRemote,
    playItemFromHand,
    addItemFromRemote,
    playHealingFromHand,
    addHealingFromRemote,
    getHeroCombatStats,
    getHealingTargets,
    canHeroAttack,
    getPlayableReactiveCards,
    resetCombatActions,
    clearSummoningSickness,
    applyCombatResult,
    resolveCombatAsHost,
    setDraggedCard,
    clearDraggedCard,
    setHoveredCard,
    clearHoveredCard,
    setPendingHealingCard,
    clearPendingHealingCard,
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
