import {
  pickHeroRecruitPlay as pickHeroRecruitPlayBaseline,
  pickItemEquipPlay as pickItemEquipPlayBaseline,
  pickHealingRecruitPlay as pickHealingRecruitPlayBaseline,
  pickAttacks as pickAttacksBaseline,
  pickDiscardCardIds as pickDiscardCardIdsBaseline
} from './botBaseline.js'

function pickHeroRecruitPlayAggressive(state, playerId, getRecruitCost) {
  const player = state.players[playerId]
  const emptySlot = player.heroes.findIndex((slot) => !slot)
  if (emptySlot === -1) return null

  const candidates = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.type === 'hero')
    .filter(({ card }) => player.resources >= getRecruitCost(playerId, card.cost))
    .sort((a, b) => {
      const costA = getRecruitCost(playerId, a.card.cost)
      const costB = getRecruitCost(playerId, b.card.cost)
      if (costA !== costB) return costB - costA
      return a.index - b.index
    })

  if (candidates.length === 0) return null
  return { cardId: candidates[0].card.id, slotIndex: emptySlot }
}

function pickHealingRecruitPlayAggressive(state, playerId, getHeroCombatStats) {
  const player = state.players[playerId]
  if (!player) return null

  const healingCards = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card?.type === 'healing')
    .filter(({ card }) => player.resources >= Number(card?.cost || 0))

  if (healingCards.length === 0) return null

  const targets = []
  for (let slotIndex = 0; slotIndex < player.heroes.length; slotIndex += 1) {
    const hero = player.heroes[slotIndex]
    if (!hero) continue
    const stats = getHeroCombatStats(hero)
    const missingHp = Math.max(0, Number(stats.maxHp || 0) - Number(stats.hp || 0))
    if (missingHp < 3) continue
    targets.push({ slotIndex, missingHp })
  }

  if (targets.length === 0) return null

  targets.sort((a, b) => b.missingHp - a.missingHp || a.slotIndex - b.slotIndex)
  healingCards.sort((a, b) => Number(a.card?.cost || 0) - Number(b.card?.cost || 0) || a.index - b.index)

  return {
    cardId: healingCards[0].card.id,
    slotIndex: targets[0].slotIndex
  }
}

function pickAttacksAggressive(state, attackerPlayerId, canHeroAttack, getHeroCombatStats) {
  const defenderPlayerId = attackerPlayerId === 'player_a' ? 'player_b' : 'player_a'
  const defenderHeroes = state.players[defenderPlayerId].heroes
  const attackers = []
  for (let attackerSlot = 0; attackerSlot < 3; attackerSlot += 1) {
    if (!canHeroAttack(attackerPlayerId, attackerSlot)) continue
    const hero = state.players[attackerPlayerId].heroes[attackerSlot]
    const stats = getHeroCombatStats(hero)
    attackers.push({ attackerSlot, atk: Number(stats.atk || 0) })
  }
  attackers.sort((a, b) => b.atk - a.atk || a.attackerSlot - b.attackerSlot)

  const attacks = []
  for (const attacker of attackers) {
    const defenderCandidates = defenderHeroes
      .map((hero, slot) => ({ hero, slot }))
      .filter(({ hero }) => Boolean(hero))
      .map(({ hero, slot }) => ({ slot, hp: Number(getHeroCombatStats(hero).hp || 0) }))
      .sort((a, b) => a.hp - b.hp || a.slot - b.slot)
    if (defenderCandidates.length === 0) break
    attacks.push({ attackerSlot: attacker.attackerSlot, defenderSlot: defenderCandidates[0].slot })
  }
  return attacks
}

const AGGRESSIVE_DISCARD_PRIORITY = {
  healing: 0,
  reactive: 1,
  counterattack: 2,
  item: 3,
  weapon: 3,
  hero: 4
}

function pickDiscardCardIdsAggressive(hand, requiredCount) {
  if (requiredCount <= 0) return []
  const ranked = hand
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const typeA = AGGRESSIVE_DISCARD_PRIORITY[a.card.type] ?? 99
      const typeB = AGGRESSIVE_DISCARD_PRIORITY[b.card.type] ?? 99
      if (typeA !== typeB) return typeA - typeB
      const costA = Number(a.card.cost || 0)
      const costB = Number(b.card.cost || 0)
      if (costA !== costB) return costB - costA
      return a.index - b.index
    })
  return ranked.slice(0, requiredCount).map(({ card }) => card.id)
}

function pickItemEquipPlayConservative(state, playerId) {
  const player = state.players[playerId]
  const allCandidates = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.type === 'item' || card.type === 'weapon')
    .filter(({ card }) => player.resources >= Number(card.cost || 0))

  const weaponCandidates = allCandidates
    .filter(({ card }) => card.type === 'weapon')
    .sort((a, b) => {
      const costA = Number(a.card?.cost || 0)
      const costB = Number(b.card?.cost || 0)
      if (costA !== costB) return costB - costA
      return a.index - b.index
    })

  const itemCandidates = allCandidates
    .filter(({ card }) => card.type === 'item')
    .sort((a, b) => {
      const defA = Number(a.card?.stats?.defBonus || 0) + Number(a.card?.stats?.defModifier || 0)
      const defB = Number(b.card?.stats?.defBonus || 0) + Number(b.card?.stats?.defModifier || 0)
      if (defA !== defB) return defB - defA
      const costA = Number(a.card?.cost || 0)
      const costB = Number(b.card?.cost || 0)
      if (costA !== costB) return costA - costB
      return a.index - b.index
    })

  if (allCandidates.length === 0) return null

  const candidates = [...weaponCandidates, ...itemCandidates]

  for (const choice of candidates) {
    for (let slotIndex = 0; slotIndex < player.heroes.length; slotIndex += 1) {
      const hero = player.heroes[slotIndex]
      if (!hero) continue
      if ((hero.items || []).length >= 3) continue
      if (choice.card.type === 'weapon') {
        const weaponCount = (hero.items || []).filter((entry) => entry?.type === 'weapon').length
        if (weaponCount >= 1) continue
      }
      return { cardId: choice.card.id, slotIndex }
    }
  }
  return null
}

function pickHealingRecruitPlayConservative(state, playerId, getHeroCombatStats) {
  const player = state.players[playerId]
  if (!player) return null

  const healingCards = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card?.type === 'healing')
    .filter(({ card }) => player.resources >= Number(card?.cost || 0))
    .sort((a, b) => Number(a.card?.cost || 0) - Number(b.card?.cost || 0) || a.index - b.index)

  if (healingCards.length === 0) return null

  let bestTarget = null
  for (let slotIndex = 0; slotIndex < player.heroes.length; slotIndex += 1) {
    const hero = player.heroes[slotIndex]
    if (!hero) continue
    const stats = getHeroCombatStats(hero)
    const missingHp = Math.max(0, Number(stats.maxHp || 0) - Number(stats.hp || 0))
    if (missingHp <= 0) continue
    const lowHpWeight = Number(stats.hp || 0) <= 2 ? 1 : 0
    const candidate = { slotIndex, missingHp, lowHpWeight }
    if (!bestTarget) {
      bestTarget = candidate
      continue
    }
    if (candidate.lowHpWeight !== bestTarget.lowHpWeight) {
      if (candidate.lowHpWeight > bestTarget.lowHpWeight) bestTarget = candidate
      continue
    }
    if (candidate.missingHp !== bestTarget.missingHp) {
      if (candidate.missingHp > bestTarget.missingHp) bestTarget = candidate
      continue
    }
    if (candidate.slotIndex < bestTarget.slotIndex) bestTarget = candidate
  }

  if (!bestTarget) return null
  return {
    cardId: healingCards[0].card.id,
    slotIndex: bestTarget.slotIndex
  }
}

function pickAttacksConservative(state, attackerPlayerId, canHeroAttack, getHeroCombatStats) {
  const defenderPlayerId = attackerPlayerId === 'player_a' ? 'player_b' : 'player_a'
  const defenderHeroes = state.players[defenderPlayerId].heroes
  const attacks = []

  for (let attackerSlot = 0; attackerSlot < 3; attackerSlot += 1) {
    if (!canHeroAttack(attackerPlayerId, attackerSlot)) continue
    const hero = state.players[attackerPlayerId].heroes[attackerSlot]
    const stats = getHeroCombatStats(hero)
    const hp = Number(stats.hp || 0)
    const maxHp = Math.max(1, Number(stats.maxHp || 1))
    const hpRatio = hp / maxHp
    if (hp <= 2 || hpRatio <= 0.34) continue

    const defenderSlot = defenderHeroes.findIndex(Boolean)
    if (defenderSlot === -1) break
    attacks.push({ attackerSlot, defenderSlot })
  }

  if (attacks.length > 0) return attacks
  return pickAttacksBaseline(state, attackerPlayerId, canHeroAttack)
}

const CONSERVATIVE_DISCARD_PRIORITY = {
  hero: 0,
  item: 1,
  weapon: 1,
  counterattack: 2,
  reactive: 3,
  healing: 4
}

function pickDiscardCardIdsConservative(hand, requiredCount) {
  if (requiredCount <= 0) return []
  const ranked = hand
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const typeA = CONSERVATIVE_DISCARD_PRIORITY[a.card.type] ?? 99
      const typeB = CONSERVATIVE_DISCARD_PRIORITY[b.card.type] ?? 99
      if (typeA !== typeB) return typeA - typeB
      const costA = Number(a.card.cost || 0)
      const costB = Number(b.card.cost || 0)
      if (costA !== costB) return costB - costA
      return a.index - b.index
    })
  return ranked.slice(0, requiredCount).map(({ card }) => card.id)
}

export const BOT_PROFILES = {
  baseline: {
    key: 'baseline',
    pickHeroRecruitPlay: pickHeroRecruitPlayBaseline,
    pickItemEquipPlay: pickItemEquipPlayBaseline,
    pickHealingRecruitPlay: pickHealingRecruitPlayBaseline,
    pickAttacks: pickAttacksBaseline,
    pickDiscardCardIds: pickDiscardCardIdsBaseline
  },
  aggressive: {
    key: 'aggressive',
    reactionStyle: 'aggressive',
    pickHeroRecruitPlay: pickHeroRecruitPlayAggressive,
    pickItemEquipPlay: pickItemEquipPlayBaseline,
    pickHealingRecruitPlay: pickHealingRecruitPlayAggressive,
    pickAttacks: pickAttacksAggressive,
    pickDiscardCardIds: pickDiscardCardIdsAggressive
  },
  conservative: {
    key: 'conservative',
    reactionStyle: 'conservative',
    pickHeroRecruitPlay: pickHeroRecruitPlayBaseline,
    pickItemEquipPlay: pickItemEquipPlayConservative,
    pickHealingRecruitPlay: pickHealingRecruitPlayConservative,
    pickAttacks: pickAttacksConservative,
    pickDiscardCardIds: pickDiscardCardIdsConservative
  }
}

export const BOT_PROFILE_NAMES = Object.keys(BOT_PROFILES)

export function resolveBotProfile(profileName) {
  const normalized = String(profileName || 'baseline').trim().toLowerCase()
  return BOT_PROFILES[normalized] || null
}
