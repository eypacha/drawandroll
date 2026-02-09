import { createRng } from './rng.js'
import {
  pickHeroRecruitPlay,
  pickItemEquipPlay,
  pickAttacks,
  pickDiscardCardIds
} from './botBaseline.js'

const MAX_HERO_SLOTS = 3
const MAX_ITEMS_PER_HERO = 3
const PLAYER_IDS = ['player_a', 'player_b']
const DEFAULT_MAX_RESOURCES = 5
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
    hasAttackedThisPhase: false
  }
}

function createItemInstance(card) {
  const instance = cloneCard(card)
  const durability = Number(card?.stats?.durability)
  if (Number.isFinite(durability) && durability > 0) {
    instance.currentDurability = durability
  }
  return instance
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

function canHeroAttack(state, playerId, slotIndex) {
  const player = state.players[playerId]
  if (!player) return false
  const hero = ensureHeroState(player.heroes[slotIndex])
  if (!hero) return false
  if (hero.currentHp <= 0) return false
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

function applyCombatResult(state, result, stats) {
  const {
    attackerPlayerId,
    attackerSlot,
    defenderPlayerId,
    defenderSlot,
    damage = 0,
    defenderHpAfter = null,
    defenderDefeated = false
  } = result

  const attackerHero = ensureHeroState(state.players[attackerPlayerId].heroes[attackerSlot])
  if (attackerHero) attackerHero.hasAttackedThisPhase = true

  const defenderPlayer = state.players[defenderPlayerId]
  if (!defenderPlayer) return false
  const defenderHero = ensureHeroState(defenderPlayer.heroes[defenderSlot])
  if (!defenderHero) return false

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
  const isCritical = attackerRoll === 20
  if (isFumble) {
    damage = 0
  } else if (isCritical) {
    damage += COMBAT_CRITICAL_BONUS
  }

  const defenderHpBefore = defenderStats.hp
  const defenderHpAfter = Math.max(0, defenderHpBefore - damage)
  const defenderDefeated = defenderHpAfter <= 0

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
    isCritical,
    isFumble,
    defenderHpBefore,
    defenderHpAfter,
    defenderDefeated
  }

  stats.totalAttacks += 1
  stats.totalDamageDealt += damage
  if (isCritical) stats.criticalCount += 1
  if (isFumble) stats.fumbleCount += 1

  applyCombatResult(state, result, stats)
  return result
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
  const criticalCount = sum('criticalCount')
  const fumbleCount = sum('fumbleCount')

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
      avgDamagePerGame: gameCount > 0 ? totalDamage / gameCount : 0,
      criticalCount,
      fumbleCount,
      critsPer100Attacks: totalAttacks > 0 ? (criticalCount / totalAttacks) * 100 : 0,
      fumblesPer100Attacks: totalAttacks > 0 ? (fumbleCount / totalAttacks) * 100 : 0
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
