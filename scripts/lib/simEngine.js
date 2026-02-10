import { createRng } from './rng.js'
import {
  pickHeroRecruitPlay,
  pickItemEquipPlay,
  pickHealingRecruitPlay,
  pickAttacks,
  pickDiscardCardIds
} from './botBaseline.js'

const MAX_HERO_SLOTS = 3
const MAX_ITEMS_PER_HERO = 3
const PLAYER_IDS = ['player_a', 'player_b']
const DEFAULT_MAX_RESOURCES = 6
const COMBAT_CRITICAL_BONUS = 2

function cloneCard(card) {
  return JSON.parse(JSON.stringify(card))
}

function createPlayerState() {
  return {
    hand: [],
    heroes: [null, null, null],
    resources: DEFAULT_MAX_RESOURCES,
    maxResources: DEFAULT_MAX_RESOURCES,
    heroesLost: 0
  }
}

function getOpponentPlayerId(playerId) {
  return playerId === 'player_a' ? 'player_b' : 'player_a'
}

function getRecruitCost(state, playerId, baseCost) {
  const lost = state.players[playerId].heroesLost
  const pressure = (lost * (lost + 1)) / 2
  return Number(baseCost || 0) + pressure
}

function getCardBaseHp(card) {
  return Math.max(1, Number(card?.stats?.hp || 0))
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
  if (!readyHero) return { atk: 0, def: 0, hp: 0, maxHp: 0 }
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
  return cloneCard(card)
}

function drawCards(state, playerId, count, stats) {
  let drawn = 0
  for (let i = 0; i < count; i += 1) {
    const next = state.deck.cards.shift()
    if (!next) break
    state.players[playerId].hand.push(next)
    drawn += 1
  }
  stats.cardsDrawnTotal += drawn
  return drawn
}

function runOpeningMulliganIfNeeded(state, playerId, rng, stats) {
  const player = state.players[playerId]
  const hasHero = player.hand.some((card) => card.type === 'hero')
  if (hasHero) return false

  const openingHand = [...player.hand]
  player.hand = []
  state.deck.cards.push(...openingHand)
  rng.shuffle(state.deck.cards)

  stats.mulliganCount += 1
  stats.cardsDiscardedTotal += openingHand.length
  drawCards(state, playerId, 7, stats)
  return true
}

function playHeroFromHand(state, playerId, cardId, slotIndex, stats) {
  const player = state.players[playerId]
  if (!player) return null
  const heroCount = player.heroes.filter(Boolean).length
  if (heroCount >= MAX_HERO_SLOTS) return null
  if (slotIndex < 0 || slotIndex >= MAX_HERO_SLOTS) return null
  if (player.heroes[slotIndex]) return null

  const handIndex = player.hand.findIndex((card) => card.id === cardId)
  if (handIndex === -1) return null
  const card = player.hand[handIndex]
  if (card.type !== 'hero') return null

  const cost = getRecruitCost(state, playerId, card.cost)
  if (player.resources < cost) return null

  player.resources -= cost
  player.hand.splice(handIndex, 1)
  player.heroes[slotIndex] = createHeroInstance(card)
  stats.cardsRecruitedTotal += 1
  return { card, cost, slotIndex }
}

function playItemFromHand(state, playerId, cardId, slotIndex, stats) {
  const player = state.players[playerId]
  if (!player) return null
  if (slotIndex < 0 || slotIndex >= MAX_HERO_SLOTS) return null

  const hero = ensureHeroState(player.heroes[slotIndex])
  if (!hero) return null
  if ((hero.items || []).length >= MAX_ITEMS_PER_HERO) return null

  const handIndex = player.hand.findIndex((card) => card.id === cardId)
  if (handIndex === -1) return null
  const card = player.hand[handIndex]
  if (card.type !== 'item') return null

  const cost = Number(card.cost || 0)
  if (player.resources < cost) return null

  const maxHpBefore = getHeroMaxHp(hero)
  player.resources -= cost
  player.hand.splice(handIndex, 1)
  hero.items.push(createItemInstance(card))
  const maxHpAfter = getHeroMaxHp(hero)
  if (maxHpAfter > maxHpBefore) {
    hero.currentHp += maxHpAfter - maxHpBefore
  }
  hero.currentHp = Math.max(0, Math.min(hero.currentHp, maxHpAfter))
  stats.itemsEquippedTotal += 1
  return { card, cost, slotIndex }
}

function playHealingFromHand(state, playerId, cardId, targetSlot, stats) {
  const player = state.players[playerId]
  if (!player) return null
  if (targetSlot < 0 || targetSlot >= MAX_HERO_SLOTS) return null

  const hero = ensureHeroState(player.heroes[targetSlot])
  if (!hero || hero.currentHp <= 0) return null

  const handIndex = player.hand.findIndex((card) => card.id === cardId)
  if (handIndex === -1) return null
  const card = player.hand[handIndex]
  if (card.type !== 'healing') return null

  const cost = Number(card.cost || 0)
  if (player.resources < cost) return null

  const maxHp = getHeroMaxHp(hero)
  const hpBefore = hero.currentHp
  const healAmount = Math.max(0, Number(card?.stats?.healAmount || 0))
  const hpAfter = Math.min(maxHp, hpBefore + healAmount)
  const appliedHeal = Math.max(0, hpAfter - hpBefore)
  if (appliedHeal <= 0) return null

  hero.currentHp = hpAfter
  player.resources -= cost
  player.hand.splice(handIndex, 1)
  stats.healingCardsUsed += 1
  stats.healingTotal += appliedHeal

  return {
    card,
    cost,
    targetSlot,
    healAmount,
    appliedHeal,
    hpBefore,
    hpAfter
  }
}

function canHeroAttack(state, playerId, slotIndex) {
  const player = state.players[playerId]
  if (!player) return false
  const hero = ensureHeroState(player.heroes[slotIndex])
  if (!hero) return false
  if (hero.currentHp <= 0) return false
  if (hero.summoningSick) return false
  return !hero.hasAttackedThisPhase
}

function resetCombatActions(state, playerId) {
  const player = state.players[playerId]
  if (!player) return
  for (const hero of player.heroes) {
    if (!hero) continue
    ensureHeroState(hero)
      hero.hasAttackedThisPhase = false
  }
}

function clearSummoningSickness(state, playerId) {
  const player = state.players[playerId]
  if (!player) return
  for (const hero of player.heroes) {
    if (!hero) continue
    ensureHeroState(hero)
    hero.summoningSick = false
  }
}

function applyCombatResult(state, result, stats) {
  const {
    attackerPlayerId,
    attackerSlot,
    defenderPlayerId,
    defenderSlot,
    damage = 0,
    attackerHpAfter = null,
    attackerDefeated = false,
    defenderHpAfter = null,
    defenderDefeated = false
  } = result

  const attackerHero = ensureHeroState(state.players[attackerPlayerId].heroes[attackerSlot])
  if (attackerHero) attackerHero.hasAttackedThisPhase = true

  const defenderPlayer = state.players[defenderPlayerId]
  if (!defenderPlayer) return false
  const defenderHero = ensureHeroState(defenderPlayer.heroes[defenderSlot])
  if (!defenderHero) return false

  const attackerPlayer = state.players[attackerPlayerId]
  const attackerBoardHero = ensureHeroState(attackerPlayer?.heroes?.[attackerSlot])
  if (attackerBoardHero) {
    if (attackerDefeated) {
      attackerPlayer.heroes[attackerSlot] = null
      attackerPlayer.heroesLost += 1
      stats.heroesKilledTotal += 1
      if (attackerPlayerId === 'player_a') stats.heroesKilledByPlayerA += 1
      if (attackerPlayerId === 'player_b') stats.heroesKilledByPlayerB += 1
    } else if (typeof attackerHpAfter === 'number') {
      const maxHp = getHeroMaxHp(attackerBoardHero)
      attackerBoardHero.currentHp = Math.max(0, Math.min(attackerHpAfter, maxHp))
    }
  }

  if (defenderDefeated) {
    defenderPlayer.heroes[defenderSlot] = null
    defenderPlayer.heroesLost += 1
    stats.heroesKilledTotal += 1
    if (defenderPlayerId === 'player_a') stats.heroesKilledByPlayerA += 1
    if (defenderPlayerId === 'player_b') stats.heroesKilledByPlayerB += 1
    return true
  }

  const maxHp = getHeroMaxHp(defenderHero)
  const fallbackHp = defenderHero.currentHp - Math.max(0, Number(damage) || 0)
  const nextHp = typeof defenderHpAfter === 'number' ? defenderHpAfter : fallbackHp
  defenderHero.currentHp = Math.max(0, Math.min(nextHp, maxHp))

  if (defenderHero.currentHp <= 0) {
    defenderPlayer.heroes[defenderSlot] = null
    defenderPlayer.heroesLost += 1
    stats.heroesKilledTotal += 1
    if (defenderPlayerId === 'player_a') stats.heroesKilledByPlayerA += 1
    if (defenderPlayerId === 'player_b') stats.heroesKilledByPlayerB += 1
  }

  return true
}

function resolveCombatAsHost(state, attackerPlayerId, attackerSlot, defenderSlot, rng, stats) {
  const defenderPlayerId = getOpponentPlayerId(attackerPlayerId)
  const attackerHero = ensureHeroState(state.players[attackerPlayerId].heroes[attackerSlot])
  const defenderHero = ensureHeroState(state.players[defenderPlayerId].heroes[defenderSlot])
  if (!attackerHero || !defenderHero) return null
  if (!canHeroAttack(state, attackerPlayerId, attackerSlot)) return null

  const attackerStats = getHeroCombatStats(attackerHero)
  const defenderStats = getHeroCombatStats(defenderHero)
  const attackerRoll = rng.int(1, 20)
  const defenderRoll = rng.int(1, 20)

  let damage = Math.max(0, attackerStats.atk + attackerRoll - (defenderStats.def + defenderRoll))
  const isFumble = attackerRoll === 1
  let isCritical = attackerRoll === 20
  if (isFumble) {
    damage = 0
  } else if (isCritical) {
    damage += COMBAT_CRITICAL_BONUS
  }

  const defenderHpBefore = defenderStats.hp
  const reactionContext = resolveDefenderReactions(state, defenderPlayerId, {
    damage,
    isCritical,
    criticalBonus: COMBAT_CRITICAL_BONUS,
    defenderSlot,
    defenderHpBefore,
    attackerDef: attackerStats.def,
    counterDamage: 0,
    counterCriticalCount: 0,
    counterFumbleCount: 0,
    counterattackUsed: false
  }, rng, stats)
  damage = reactionContext.damage
  isCritical = reactionContext.isCritical
  const defenderEffectiveHpBefore = Number(reactionContext.defenderHpBefore || defenderHpBefore)
  const counterDamageTotal = reactionContext.counterDamage
  const reactions = reactionContext.reactions
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
    attackerRoll,
    defenderRoll,
    attackerTotal: attackerStats.atk + attackerRoll,
    defenderTotal: defenderStats.def + defenderRoll,
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

  stats.totalAttacks += 1
  stats.totalDamageDealt += damage
  stats.totalCounterDamageDealt += counterDamageTotal
  if (isCritical) stats.criticalCount += 1
  if (isFumble) stats.fumbleCount += 1
  if (attackerDefeated) stats.attackerDeathsByCounter += 1

  applyCombatResult(state, result, stats)
  return result
}

function applyReactiveEffect(card, { damage, isCritical, criticalBonus, defenderHpBefore }) {
  const effect = card?.effect
  const next = {
    damage,
    isCritical
  }

  if (effect === 'reduce_damage') {
    const reduction = Math.max(0, Number(card?.stats?.damageReduction) || 0)
    if (reduction <= 0 || next.damage <= 0) return null
    next.damage = Math.max(0, next.damage - reduction)
    return next
  }

  if (effect === 'cancel_critical') {
    if (!next.isCritical || criticalBonus <= 0 || next.damage <= 0) return null
    next.damage = Math.max(0, next.damage - criticalBonus)
    next.isCritical = false
    return next
  }

  if (effect === 'prevent_death') {
    if (next.damage < defenderHpBefore) return null
    next.damage = Math.max(0, defenderHpBefore - 1)
    return next
  }

  return null
}

function pickBestHealingTarget(state, defenderPlayerId, context) {
  const defender = state.players[defenderPlayerId]
  if (!defender) return null

  let best = null
  for (let slotIndex = 0; slotIndex < defender.heroes.length; slotIndex += 1) {
    const hero = ensureHeroState(defender.heroes[slotIndex])
    if (!hero || hero.currentHp <= 0) continue
    const heroStats = getHeroCombatStats(hero)
    const missingHp = Math.max(0, Number(heroStats.maxHp || 0) - Number(heroStats.hp || 0))
    if (missingHp <= 0) continue
    const isDefenderSlot = slotIndex === context.defenderSlot
    const wouldDieWithoutHealing = isDefenderSlot && context.damage >= heroStats.hp
    const heroValue = Number(heroStats.atk || 0) + Number(heroStats.def || 0) + (hero.items?.length || 0)
    const candidate = {
      slotIndex,
      missingHp,
      heroValue,
      wouldDieWithoutHealing
    }

    if (!best) {
      best = candidate
      continue
    }
    if (candidate.wouldDieWithoutHealing !== best.wouldDieWithoutHealing) {
      if (candidate.wouldDieWithoutHealing) best = candidate
      continue
    }
    if (candidate.heroValue !== best.heroValue) {
      if (candidate.heroValue > best.heroValue) best = candidate
      continue
    }
    if (candidate.missingHp !== best.missingHp) {
      if (candidate.missingHp > best.missingHp) best = candidate
      continue
    }
    if (candidate.slotIndex < best.slotIndex) {
      best = candidate
    }
  }

  return best
}

function evaluateReactionCandidate(state, defenderPlayerId, card, context, rng) {
  if (card?.type === 'reactive') {
    const applied = applyReactiveEffect(card, context)
    if (!applied) return null
    return {
      type: 'reactive',
      card,
      nextDamage: applied.damage,
      nextIsCritical: applied.isCritical,
      counterDamage: context.counterDamage,
      counterCriticalCount: context.counterCriticalCount,
      counterFumbleCount: context.counterFumbleCount,
      counterattackUsed: false,
      counterDamageAdded: 0
    }
  }

  if (card?.type === 'counterattack') {
    if (context.counterattackUsed) return null
    const counterDamage = Math.max(0, Number(card?.stats?.counterDamage || 0))
    const counterAttackRoll = rng.int(1, 20)
    const counterDefenseRoll = rng.int(1, 20)
    const isFumble = counterAttackRoll === 1
    const isCritical = counterAttackRoll === 20
    const attackerDef = Math.max(0, Number(context.attackerDef || 0))
    let counterFinal = Math.max(
      0,
      (counterDamage + counterAttackRoll) - (attackerDef + counterDefenseRoll)
    )
    if (isFumble) counterFinal = 0
    if (isCritical) counterFinal += COMBAT_CRITICAL_BONUS
    return {
      type: 'counterattack',
      card,
      nextDamage: context.damage,
      nextIsCritical: context.isCritical,
      counterDamage: context.counterDamage + counterFinal,
      counterCriticalCount: context.counterCriticalCount + (isCritical ? 1 : 0),
      counterFumbleCount: context.counterFumbleCount + (isFumble ? 1 : 0),
      counterattackUsed: true,
      counterDamageAdded: counterFinal
    }
  }

  if (card?.type === 'healing') {
    const target = pickBestHealingTarget(state, defenderPlayerId, context)
    if (!target) return null
    const healAmount = Math.max(0, Number(card?.stats?.healAmount || 0))
    const appliedHeal = Math.min(target.missingHp, healAmount)
    if (appliedHeal <= 0) return null

    const isTargetDefender = target.slotIndex === context.defenderSlot
    const defenderHpBefore = Number(context.defenderHpBefore || 0)
    const nextDefenderHpBefore = isTargetDefender ? defenderHpBefore + appliedHeal : defenderHpBefore
    const nextDamage = context.damage
    const preventedDeath = isTargetDefender && context.damage >= defenderHpBefore && context.damage < nextDefenderHpBefore

    return {
      type: 'healing',
      card,
      nextDamage,
      nextIsCritical: context.isCritical,
      counterDamage: context.counterDamage,
      counterCriticalCount: context.counterCriticalCount,
      counterFumbleCount: context.counterFumbleCount,
      counterattackUsed: context.counterattackUsed,
      counterDamageAdded: 0,
      targetSlot: target.slotIndex,
      healAmount,
      appliedHeal,
      preventedDeath,
      nextDefenderHpBefore
    }
  }

  return null
}

function chooseDefenderReactionCard(state, defenderPlayerId, context, rng) {
  const defender = state.players[defenderPlayerId]
  if (!defender) return null

  const candidates = defender.hand
    .map((card, handIndex) => ({ card, handIndex }))
    .filter(({ card }) => card?.type === 'reactive' || card?.type === 'counterattack' || card?.type === 'healing')
    .filter(({ card }) => defender.resources >= Number(card?.cost || 0))

  if (candidates.length === 0) return null

  let bestChoice = null
  for (const candidate of candidates) {
    const applied = evaluateReactionCandidate(state, defenderPlayerId, candidate.card, context, rng)
    if (!applied) continue

    const effectiveDefenderHpBefore = Number(applied.nextDefenderHpBefore ?? context.defenderHpBefore)
    const nextHp = Math.max(0, effectiveDefenderHpBefore - applied.nextDamage)
    const score = {
      survives: nextHp > 0 ? 1 : 0,
      damageSaved: Math.max(0, context.damage - applied.nextDamage),
      counterDamage: Math.max(0, applied.counterDamage - context.counterDamage),
      healingApplied: Math.max(0, Number(applied.appliedHeal || 0)),
      preventedDeath: applied.preventedDeath ? 1 : 0,
      remainingHp: nextHp,
      handIndex: -candidate.handIndex
    }

    if (!bestChoice) {
      bestChoice = { candidate, applied, score }
      continue
    }

    const prevScore = bestChoice.score
    if (score.preventedDeath !== prevScore.preventedDeath) {
      if (score.preventedDeath > prevScore.preventedDeath) bestChoice = { candidate, applied, score }
      continue
    }
    if (score.survives !== prevScore.survives) {
      if (score.survives > prevScore.survives) bestChoice = { candidate, applied, score }
      continue
    }
    if (score.damageSaved !== prevScore.damageSaved) {
      if (score.damageSaved > prevScore.damageSaved) bestChoice = { candidate, applied, score }
      continue
    }
    if (score.healingApplied !== prevScore.healingApplied) {
      if (score.healingApplied > prevScore.healingApplied) bestChoice = { candidate, applied, score }
      continue
    }
    if (score.counterDamage !== prevScore.counterDamage) {
      if (score.counterDamage > prevScore.counterDamage) bestChoice = { candidate, applied, score }
      continue
    }
    if (score.remainingHp !== prevScore.remainingHp) {
      if (score.remainingHp > prevScore.remainingHp) bestChoice = { candidate, applied, score }
      continue
    }
    if (score.handIndex > prevScore.handIndex) {
      bestChoice = { candidate, applied, score }
    }
  }

  if (!bestChoice) return null

  return bestChoice
}

function resolveDefenderReactions(state, defenderPlayerId, context, rng, stats) {
  const defender = state.players[defenderPlayerId]
  if (!defender) return context

  const nextContext = { ...context, reactions: [] }
  const bestChoice = chooseDefenderReactionCard(state, defenderPlayerId, nextContext, rng)
  if (!bestChoice) return nextContext

  const card = bestChoice.candidate.card
  const cost = Number(card?.cost || 0)
  if (defender.resources < cost) return nextContext

  nextContext.damage = bestChoice.applied.nextDamage
  nextContext.isCritical = bestChoice.applied.nextIsCritical
  nextContext.counterDamage = bestChoice.applied.counterDamage
  nextContext.counterCriticalCount = bestChoice.applied.counterCriticalCount
  nextContext.counterFumbleCount = bestChoice.applied.counterFumbleCount
  nextContext.counterattackUsed = Boolean(bestChoice.applied.counterattackUsed || nextContext.counterattackUsed)
  if (typeof bestChoice.applied.nextDefenderHpBefore === 'number') {
    nextContext.defenderHpBefore = bestChoice.applied.nextDefenderHpBefore
  }
  defender.hand = defender.hand.filter((entry) => entry.id !== card.id)
  defender.resources = Math.max(0, defender.resources - cost)
  nextContext.reactions.push({
    type: card.type,
    cardId: card.id,
    effect: card.effect || null,
    cost,
    resourcesAfter: defender.resources,
    counterDamageAdded: bestChoice.applied.counterDamageAdded,
    targetSlot: Number.isInteger(bestChoice.applied.targetSlot) ? bestChoice.applied.targetSlot : null,
    healAmount: Number(bestChoice.applied.healAmount || 0),
    appliedHeal: Number(bestChoice.applied.appliedHeal || 0),
    preventedDeath: Boolean(bestChoice.applied.preventedDeath)
  })
  if (card.type === 'counterattack') {
    stats.counterattacksUsed += 1
    stats.counterattackDamageDealt += bestChoice.applied.counterDamageAdded
  }
  if (card.type === 'healing') {
    const targetSlot = bestChoice.applied.targetSlot
    if (Number.isInteger(targetSlot) && targetSlot >= 0 && targetSlot < MAX_HERO_SLOTS) {
      const hero = ensureHeroState(defender.heroes[targetSlot])
      if (hero && hero.currentHp > 0) {
        const maxHp = getHeroMaxHp(hero)
        hero.currentHp = Math.max(0, Math.min(hero.currentHp + Number(bestChoice.applied.appliedHeal || 0), maxHp))
      }
    }
    stats.healingCardsUsed += 1
    stats.healingTotal += Number(bestChoice.applied.appliedHeal || 0)
    if (bestChoice.applied.preventedDeath) {
      stats.healingPreventedDeaths += 1
    }
  }

  return nextContext
}

function discardFromHand(state, playerId, cardIds, stats) {
  const player = state.players[playerId]
  if (!player || !Array.isArray(cardIds) || cardIds.length === 0) return []
  const uniqueIds = [...new Set(cardIds)].filter(Boolean)
  const handById = new Map(player.hand.map((card) => [card.id, card]))
  const discardedCards = []
  for (const cardId of uniqueIds) {
    const card = handById.get(cardId)
    if (!card) return []
    discardedCards.push(card)
  }
  const selectedSet = new Set(uniqueIds)
  player.hand = player.hand.filter((card) => !selectedSet.has(card.id))
  for (const card of discardedCards) {
    state.deck.discardPile.push(card)
  }
  stats.cardsDiscardedTotal += discardedCards.length
  return discardedCards
}

function getRequiredDiscardCount(state, playerId) {
  return Math.max(0, state.players[playerId].hand.length - 7)
}

function finishTurn(state) {
  const activePlayer = state.game.currentTurn
  const hasHeroes = state.players[activePlayer].heroes.some(Boolean)

  if (!hasHeroes) {
    state.game.phase = 'ended'
    state.game.turnPhase = 'end'
    state.game.winner = getOpponentPlayerId(activePlayer)
    return { ended: true, loser: activePlayer }
  }

  const nextPlayer = getOpponentPlayerId(activePlayer)
  state.game.currentTurn = nextPlayer
  if (nextPlayer === 'player_a') {
    state.game.turn += 1
  }
  state.game.turnPhase = 'draw'
  clearSummoningSickness(state, nextPlayer)
  state.players[nextPlayer].resources = state.players[nextPlayer].maxResources
  return { ended: false }
}

function runRecruitPhase(state, playerId, stats) {
  while (true) {
    const play = pickHeroRecruitPlay(state, playerId, (id, baseCost) => getRecruitCost(state, id, baseCost))
    if (!play) break
    const done = playHeroFromHand(state, playerId, play.cardId, play.slotIndex, stats)
    if (!done) break
  }

  while (true) {
    const play = pickItemEquipPlay(state, playerId)
    if (!play) break
    const done = playItemFromHand(state, playerId, play.cardId, play.slotIndex, stats)
    if (!done) break
  }

  while (true) {
    const play = pickHealingRecruitPlay(state, playerId, getHeroCombatStats)
    if (!play) break
    const done = playHealingFromHand(state, playerId, play.cardId, play.slotIndex, stats)
    if (!done) break
  }
}

function runCombatPhase(state, playerId, rng, stats) {
  const attacks = pickAttacks(state, playerId, (id, slot) => canHeroAttack(state, id, slot))
  for (const attack of attacks) {
    const defenderPlayerId = getOpponentPlayerId(playerId)
    if (!state.players[defenderPlayerId].heroes.some(Boolean)) break
    resolveCombatAsHost(state, playerId, attack.attackerSlot, attack.defenderSlot, rng, stats)
  }
}

function runDiscardPhase(state, playerId, stats) {
  const required = getRequiredDiscardCount(state, playerId)
  if (required <= 0) return
  const cardIds = pickDiscardCardIds(state.players[playerId].hand, required)
  discardFromHand(state, playerId, cardIds, stats)
}

function createInitialState(batchCards, gameRng) {
  const deckCards = batchCards.map((card) => cloneCard(card))
  gameRng.shuffle(deckCards)

  const firstTurnPlayer = gameRng.int(0, 1) === 0 ? 'player_a' : 'player_b'

  const state = {
    game: {
      phase: 'playing',
      turn: 1,
      currentTurn: firstTurnPlayer,
      firstTurnPlayer,
      turnPhase: 'recruit',
      winner: null
    },
    deck: {
      cards: deckCards,
      discardPile: []
    },
    players: {
      player_a: createPlayerState(),
      player_b: createPlayerState()
    }
  }

  state.players[firstTurnPlayer].resources = state.players[firstTurnPlayer].maxResources
  const secondPlayer = getOpponentPlayerId(firstTurnPlayer)
  state.players[secondPlayer].resources = state.players[secondPlayer].maxResources

  return state
}

function runSingleGame({ batchCards, gameIndex, seed, maxTurns = 200 }) {
  const rng = createRng(seed)
  const state = createInitialState(batchCards, rng)

  const stats = {
    gameIndex,
    seedUsed: seed,
    startingPlayer: state.game.firstTurnPlayer,
    winner: null,
    winnerIsStarter: false,
    turnCount: 0,
    endedByNoHeroes: false,
    timedOutByMaxTurns: false,
    heroesKilledTotal: 0,
    heroesKilledByPlayerA: 0,
    heroesKilledByPlayerB: 0,
    totalAttacks: 0,
    criticalCount: 0,
    fumbleCount: 0,
    totalDamageDealt: 0,
    totalCounterDamageDealt: 0,
    counterattacksUsed: 0,
    counterattackDamageDealt: 0,
    attackerDeathsByCounter: 0,
    healingCardsUsed: 0,
    healingTotal: 0,
    healingPreventedDeaths: 0,
    cardsDrawnTotal: 0,
    cardsRecruitedTotal: 0,
    itemsEquippedTotal: 0,
    cardsDiscardedTotal: 0,
    mulliganCount: 0,
    finalHeroesPlayerA: 0,
    finalHeroesPlayerB: 0,
    deckRemaining: 0
  }

  drawCards(state, state.game.firstTurnPlayer, 7, stats)
  drawCards(state, getOpponentPlayerId(state.game.firstTurnPlayer), 7, stats)
  runOpeningMulliganIfNeeded(state, state.game.firstTurnPlayer, rng, stats)
  runOpeningMulliganIfNeeded(state, getOpponentPlayerId(state.game.firstTurnPlayer), rng, stats)

  while (state.game.phase === 'playing') {
    if (state.game.turn > maxTurns) {
      stats.timedOutByMaxTurns = true
      break
    }

    const activePlayer = state.game.currentTurn

    if (state.game.turnPhase === 'draw') {
      drawCards(state, activePlayer, 1, stats)
      state.game.turnPhase = 'recruit'
      continue
    }

    if (state.game.turnPhase === 'recruit') {
      runRecruitPhase(state, activePlayer, stats)
      if (state.game.turn === 1 && activePlayer === state.game.firstTurnPlayer) {
        const required = getRequiredDiscardCount(state, activePlayer)
        if (required > 0) {
          state.game.turnPhase = 'discard'
        } else {
          const result = finishTurn(state)
          if (result.ended) stats.endedByNoHeroes = true
        }
        continue
      }
      state.game.turnPhase = 'combat'
      resetCombatActions(state, activePlayer)
      continue
    }

    if (state.game.turnPhase === 'combat') {
      runCombatPhase(state, activePlayer, rng, stats)
      const required = getRequiredDiscardCount(state, activePlayer)
      if (required > 0) {
        state.game.turnPhase = 'discard'
      } else {
        const result = finishTurn(state)
        if (result.ended) stats.endedByNoHeroes = true
      }
      continue
    }

    if (state.game.turnPhase === 'discard') {
      runDiscardPhase(state, activePlayer, stats)
      if (getRequiredDiscardCount(state, activePlayer) > 0) {
        stats.timedOutByMaxTurns = true
        break
      }
      const result = finishTurn(state)
      if (result.ended) stats.endedByNoHeroes = true
      continue
    }

    if (state.game.turnPhase === 'end') {
      const result = finishTurn(state)
      if (result.ended) stats.endedByNoHeroes = true
      continue
    }

    break
  }

  stats.turnCount = Math.max(1, state.game.turn)
  stats.winner = state.game.winner
  stats.winnerIsStarter = Boolean(stats.winner && stats.winner === stats.startingPlayer)
  stats.finalHeroesPlayerA = state.players.player_a.heroes.filter(Boolean).length
  stats.finalHeroesPlayerB = state.players.player_b.heroes.filter(Boolean).length
  stats.deckRemaining = state.deck.cards.length

  return stats
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return 0
  if (sortedValues.length === 1) return sortedValues[0]
  const rank = (p / 100) * (sortedValues.length - 1)
  const lo = Math.floor(rank)
  const hi = Math.ceil(rank)
  if (lo === hi) return sortedValues[lo]
  const ratio = rank - lo
  return sortedValues[lo] * (1 - ratio) + sortedValues[hi] * ratio
}

export function aggregateResults(games) {
  const gameCount = games.length
  const turns = games.map((g) => g.turnCount).sort((a, b) => a - b)

  const sum = (key) => games.reduce((acc, g) => acc + Number(g[key] || 0), 0)

  const winsStarter = games.filter((g) => g.winnerIsStarter).length
  const winsNonStarter = games.filter((g) => g.winner && !g.winnerIsStarter).length
  const winnerDist = {
    player_a: games.filter((g) => g.winner === 'player_a').length,
    player_b: games.filter((g) => g.winner === 'player_b').length,
    none: games.filter((g) => !g.winner).length
  }

  const totalAttacks = sum('totalAttacks')
  const totalDamage = sum('totalDamageDealt')
  const totalCounterDamage = sum('totalCounterDamageDealt')
  const criticalCount = sum('criticalCount')
  const fumbleCount = sum('fumbleCount')
  const counterattacksUsed = sum('counterattacksUsed')
  const healingCardsUsed = sum('healingCardsUsed')
  const healingTotal = sum('healingTotal')
  const healingPreventedDeaths = sum('healingPreventedDeaths')

  return {
    games: gameCount,
    winsStarter,
    winsNonStarter,
    starterWinRate: gameCount > 0 ? winsStarter / gameCount : 0,
    winnerDistribution: winnerDist,
    turns: {
      min: turns[0] || 0,
      max: turns[turns.length - 1] || 0,
      avg: gameCount > 0 ? sum('turnCount') / gameCount : 0,
      p50: percentile(turns, 50),
      p90: percentile(turns, 90)
    },
    heroesKilled: {
      total: sum('heroesKilledTotal'),
      avgPerGame: gameCount > 0 ? sum('heroesKilledTotal') / gameCount : 0,
      playerA: sum('heroesKilledByPlayerA'),
      playerB: sum('heroesKilledByPlayerB')
    },
    combat: {
      totalAttacks,
      avgAttacksPerGame: gameCount > 0 ? totalAttacks / gameCount : 0,
      totalDamage,
      totalCounterDamage,
      avgDamagePerGame: gameCount > 0 ? totalDamage / gameCount : 0,
      avgCounterDamagePerGame: gameCount > 0 ? totalCounterDamage / gameCount : 0,
      criticalCount,
      fumbleCount,
      critsPer100Attacks: totalAttacks > 0 ? (criticalCount / totalAttacks) * 100 : 0,
      fumblesPer100Attacks: totalAttacks > 0 ? (fumbleCount / totalAttacks) * 100 : 0
    },
    reactions: {
      counterattacksUsed,
      avgCounterattacksPerGame: gameCount > 0 ? counterattacksUsed / gameCount : 0,
      attackerDeathsByCounter: sum('attackerDeathsByCounter'),
      healingCardsUsed,
      avgHealingCardsPerGame: gameCount > 0 ? healingCardsUsed / gameCount : 0,
      healingTotal,
      avgHealingPerGame: gameCount > 0 ? healingTotal / gameCount : 0,
      healingPreventedDeaths
    },
    economy: {
      cardsDrawnTotal: sum('cardsDrawnTotal'),
      cardsRecruitedTotal: sum('cardsRecruitedTotal'),
      itemsEquippedTotal: sum('itemsEquippedTotal'),
      cardsDiscardedTotal: sum('cardsDiscardedTotal'),
      avgDiscardsPerGame: gameCount > 0 ? sum('cardsDiscardedTotal') / gameCount : 0
    },
    mulligan: {
      total: sum('mulliganCount'),
      gamesWithMulligan: games.filter((g) => g.mulliganCount > 0).length,
      pctGamesWithMulligan: gameCount > 0 ? (games.filter((g) => g.mulliganCount > 0).length / gameCount) * 100 : 0
    },
    endedByNoHeroes: games.filter((g) => g.endedByNoHeroes).length,
    timeouts: games.filter((g) => g.timedOutByMaxTurns).length
  }
}

export function runSimulation({ games, batchCards, baseSeed, maxTurns = 200, verbose = false }) {
  const results = []
  for (let i = 0; i < games; i += 1) {
    const gameSeed = `${baseSeed}:${i + 1}`
    const gameResult = runSingleGame({
      batchCards,
      gameIndex: i + 1,
      seed: gameSeed,
      maxTurns
    })
    results.push(gameResult)

    if (verbose) {
      const starter = gameResult.startingPlayer
      const winner = gameResult.winner || 'none'
      const turns = gameResult.turnCount
      const attacks = gameResult.totalAttacks
      process.stdout.write(
        `[${i + 1}/${games}] starter=${starter} winner=${winner} turns=${turns} attacks=${attacks}\n`
      )
    }
  }

  return {
    perGame: results,
    aggregate: aggregateResults(results)
  }
}
