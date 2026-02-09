const DISCARD_TYPE_PRIORITY = {
  reactive: 0,
  healing: 1,
  item: 2,
  hero: 3
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
  const candidates = player.hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => card.type === 'item')
    .filter(({ card }) => player.resources >= Number(card.cost || 0))
    .sort(byCostThenIndexDesc)

  if (candidates.length === 0) return null

  for (const choice of candidates) {
    for (let slotIndex = 0; slotIndex < player.heroes.length; slotIndex += 1) {
      const hero = player.heroes[slotIndex]
      if (!hero) continue
      if ((hero.items || []).length >= 3) continue
      return {
        cardId: choice.card.id,
        slotIndex
      }
    }
  }

  return null
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
