const DISCARD_TYPE_PRIORITY = {
  reactive: 0,
  counterattack: 1,
  healing: 2,
  item: 3,
  weapon: 3,
  hero: 4
}

function byCostThenIndexDesc(a, b) {
  const costA = Number(a.card?.cost || 0)
  const costB = Number(b.card?.cost || 0)
  if (costA !== costB) return costB - costA
  return a.index - b.index
}

export function pickHeroRecruitPlay(state, playerId, getRecruitCost) {
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
      if (costA !== costB) return costA - costB
      return a.index - b.index
    })

  if (candidates.length === 0) return null
  const choice = candidates[0]
  return {
    cardId: choice.card.id,
    slotIndex: emptySlot
  }
}

export function pickItemEquipPlay(state, playerId) {
  const player = state.players[playerId]
  const allCandidates = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.type === 'item' || card.type === 'weapon')
    .filter(({ card }) => player.resources >= Number(card.cost || 0))
  const weaponCandidates = allCandidates
    .filter(({ card }) => card.type === 'weapon')
    .sort(byCostThenIndexDesc)
  const itemCandidates = allCandidates
    .filter(({ card }) => card.type === 'item')
    .sort(byCostThenIndexDesc)

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
      return {
        cardId: choice.card.id,
        slotIndex
      }
    }
  }

  return null
}

export function pickHealingRecruitPlay(state, playerId, getHeroCombatStats) {
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
    if (missingHp < 2) continue
    const itemCount = Array.isArray(hero.items) ? hero.items.length : 0
    const heroValue = Number(stats.atk || 0) + Number(stats.def || 0) + itemCount
    targets.push({ slotIndex, missingHp, heroValue })
  }

  if (targets.length === 0) return null

  targets.sort((a, b) => {
    if (a.heroValue !== b.heroValue) return b.heroValue - a.heroValue
    if (a.missingHp !== b.missingHp) return b.missingHp - a.missingHp
    return a.slotIndex - b.slotIndex
  })

  healingCards.sort((a, b) => {
    const costA = Number(a.card?.cost || 0)
    const costB = Number(b.card?.cost || 0)
    if (costA !== costB) return costA - costB
    return a.index - b.index
  })

  return {
    cardId: healingCards[0].card.id,
    slotIndex: targets[0].slotIndex
  }
}

export function pickAttacks(state, attackerPlayerId, canHeroAttack) {
  const defenderPlayerId = attackerPlayerId === 'player_a' ? 'player_b' : 'player_a'
  const defenderHeroes = state.players[defenderPlayerId].heroes
  const attacks = []

  for (let attackerSlot = 0; attackerSlot < 3; attackerSlot += 1) {
    if (!canHeroAttack(attackerPlayerId, attackerSlot)) continue
    const defenderSlot = defenderHeroes.findIndex(Boolean)
    if (defenderSlot === -1) break
    attacks.push({ attackerSlot, defenderSlot })
  }

  return attacks
}

export function pickDiscardCardIds(hand, requiredCount) {
  if (requiredCount <= 0) return []

  const ranked = hand
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const typeA = DISCARD_TYPE_PRIORITY[a.card.type] ?? 99
      const typeB = DISCARD_TYPE_PRIORITY[b.card.type] ?? 99
      if (typeA !== typeB) return typeA - typeB
      const costA = Number(a.card.cost || 0)
      const costB = Number(b.card.cost || 0)
      if (costA !== costB) return costB - costA
      return a.index - b.index
    })

  return ranked.slice(0, requiredCount).map(({ card }) => card.id)
}
