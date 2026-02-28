import { computed } from 'vue'
import { useCombatStore, useConnectionStore, useDeckStore, useGameStore, usePlayersStore } from '@/stores'
import { sendMessage } from '@/services/peerService'

const COMBAT_CRITICAL_BONUS = 3
const COMBAT_ROLL_ANIMATION_MS = 1000
const ATTACK_ROLL_DIE_SIDES = 20
const DEFAULT_DAMAGE_DIE_SIDES = 2
const DEFENSE_DIE_SIDES = 20

function normalizeDamageDieSides(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return DEFAULT_DAMAGE_DIE_SIDES
  if (numeric >= 6) return 6
  if (numeric >= 4) return 4
  return 2
}

export function useGameActions() {
  const connection = useConnectionStore()
  const game = useGameStore()
  const players = usePlayersStore()
  const deck = useDeckStore()
  const combat = useCombatStore()
  const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
  const REACTION_REVEAL_DURATION_MS = 2000

  function applyLocalReactionReveal(playerId, card) {
    if (!playerId || !card?.id) return false
    players.hideHandCard(playerId, card.id)
    combat.showReactionReveal({
      playerId,
      card,
      shownAt: Date.now(),
      durationMs: REACTION_REVEAL_DURATION_MS
    })
    return true
  }

  function broadcastReactionReveal(playerId, card) {
    if (!playerId || !card?.id) return false
    return sendMessage({
      type: 'reaction_reveal',
      payload: {
        playerId,
        card,
        shownAt: Date.now(),
        durationMs: REACTION_REVEAL_DURATION_MS
      }
    })
  }

  function syncAdvanceResult(result) {
    if (!result) return false
    if (result.type === 'ended') {
      const loser = result.loser || getOpponentPlayerId(result.winner)
      sendMessage({
        type: 'game_end',
        payload: {
          winner: result.winner,
          loser,
          endedAt: Date.now()
        }
      })
      return true
    }

    sendMessage({
      type: 'advance_phase',
      payload: {
        turn: result.turn,
        currentTurn: result.currentTurn,
        turnPhase: result.turnPhase
      }
    })
    return true
  }

  function advancePhase() {
    if (!game.isPlaying || combat.isRolling) return false

    if (connection.isHost) {
      const result = game.advancePhase()
      return syncAdvanceResult(result)
    }

    return sendMessage({
      type: 'advance_phase_request',
      payload: {
        playerId: myPlayerId.value,
        requestedAt: Date.now()
      }
    })
  }

  function handleAdvancePhaseRequest(payload = {}) {
    if (!connection.isHost) return false
    if (!game.isPlaying || combat.isRolling) return false

    const requesterId = payload?.playerId
    if (requesterId !== 'player_a' && requesterId !== 'player_b') return false
    if (requesterId === myPlayerId.value) return false
    if (game.currentTurn !== requesterId) return false

    const result = game.advancePhase()
    return syncAdvanceResult(result)
  }

  function applyDiscardAndAdvance(playerId, cardIds) {
    const requiredDiscardCount = game.getRequiredDiscardCount(playerId)
    if (requiredDiscardCount <= 0) return false
    if (!Array.isArray(cardIds)) return false
    const uniqueCardIds = [...new Set(cardIds)].filter(Boolean)
    if (uniqueCardIds.length !== requiredDiscardCount) return false

    const handIds = new Set(players.players[playerId].hand.map((card) => card.id))
    if (uniqueCardIds.some((cardId) => !handIds.has(cardId))) return false

    const discardedCards = players.discardFromHand(playerId, uniqueCardIds)
    if (discardedCards.length !== requiredDiscardCount) return false
    for (const card of discardedCards) {
      deck.discard(card)
    }

    sendMessage({
      type: 'discard_hand',
      payload: {
        playerId,
        cardIds: uniqueCardIds
      }
    })

    const result = game.endTurn()
    return syncAdvanceResult(result)
  }

  function discardSelectedHand() {
    if (!game.isPlaying || combat.isRolling) return false
    if (game.turnPhase !== 'discard') return false
    if (game.currentTurn !== myPlayerId.value) return false

    const requiredDiscardCount = game.getRequiredDiscardCount(myPlayerId.value)
    if (requiredDiscardCount <= 0) return false
    const selectedCardIds = players.players[myPlayerId.value].discardSelectionIds || []
    if (selectedCardIds.length !== requiredDiscardCount) return false

    if (connection.isHost) {
      return applyDiscardAndAdvance(myPlayerId.value, selectedCardIds)
    }

    return sendMessage({
      type: 'discard_request',
      payload: {
        playerId: myPlayerId.value,
        cardIds: selectedCardIds,
        requestedAt: Date.now()
      }
    })
  }

  function handleDiscardRequest(payload = {}) {
    if (!connection.isHost) return false
    if (!game.isPlaying || combat.isRolling) return false
    if (game.turnPhase !== 'discard') return false

    const requesterId = payload?.playerId
    if (requesterId !== 'player_a' && requesterId !== 'player_b') return false
    if (requesterId === myPlayerId.value) return false
    if (game.currentTurn !== requesterId) return false

    return applyDiscardAndAdvance(requesterId, payload?.cardIds || [])
  }

  function playHeroToSlot(slotIndex, cardId) {
    if (!game.isPlaying) return null
    const played = players.playHeroFromHand(myPlayerId.value, cardId, slotIndex)
    if (!played) return null
    sendMessage({
      type: 'recruit_hero',
      payload: {
        playerId: myPlayerId.value,
        card: played.card,
        cost: played.cost,
        slotIndex: played.slotIndex
      }
    })
    return played
  }

  function playItemToSlot(slotIndex, cardId) {
    if (!game.isPlaying) return null
    const played = players.playItemFromHand(myPlayerId.value, cardId, slotIndex)
    if (!played) return null
    sendMessage({
      type: 'equip_item',
      payload: {
        playerId: myPlayerId.value,
        card: played.card,
        cost: played.cost,
        slotIndex: played.slotIndex
      }
    })
    return played
  }

  function playHealingToSlot(slotIndex, cardId) {
    if (!game.isPlaying) return null
    if (game.turnPhase !== 'recruit') return null
    if (game.currentTurn !== myPlayerId.value) return null
    const played = players.playHealingFromHand(myPlayerId.value, cardId, slotIndex)
    if (!played) return null
    sendMessage({
      type: 'play_healing',
      payload: {
        playerId: myPlayerId.value,
        card: played.card,
        cost: played.cost,
        targetSlot: played.targetSlot,
        appliedHeal: played.appliedHeal,
        hpBefore: played.hpBefore,
        hpAfter: played.hpAfter,
        playedAt: Date.now()
      }
    })
    return played
  }

  function setHoveredCard(cardId) {
    if (!game.isPlaying) return false
    players.setHoveredCard(myPlayerId.value, cardId)
    sendMessage({
      type: 'hover_card',
      payload: { playerId: myPlayerId.value, cardId }
    })
    return true
  }

  function clearHoveredCard(expectedCardId = null) {
    if (!game.isPlaying) return false
    if (expectedCardId && players.players[myPlayerId.value].hoveredCardId !== expectedCardId) {
      return false
    }
    players.clearHoveredCard(myPlayerId.value)
    sendMessage({
      type: 'hover_card',
      payload: { playerId: myPlayerId.value, cardId: null }
    })
    return true
  }

  function toValidSlotIndex(value) {
    const parsed = Number(value)
    if (!Number.isInteger(parsed)) return null
    if (parsed < 0 || parsed > 2) return null
    return parsed
  }

  function getOpponentPlayerId(playerId) {
    return playerId === 'player_a' ? 'player_b' : 'player_a'
  }

  function randomDie(sides) {
    const safeSides = Math.max(2, Number(sides) || 20)
    return Math.floor(Math.random() * safeSides) + 1
  }

  function randomD20() {
    return randomDie(DEFENSE_DIE_SIDES)
  }

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  function canRunCombat(attackerPlayerId, attackerSlot, defenderSlot) {
    if (combat.isRolling) return false
    if (game.turnPhase !== 'combat') return false
    if (game.currentTurn !== attackerPlayerId) return false
    if (!players.canHeroAttack(attackerPlayerId, attackerSlot)) return false
    const defenderPlayerId = getOpponentPlayerId(attackerPlayerId)
    const defenderHero = players.players[defenderPlayerId].heroes[defenderSlot]
    return Boolean(defenderHero)
  }

  function getActiveCombatOrNull() {
    const active = combat.activeRoll
    if (!active?.combatId) return null
    return active
  }

  function hasPlayableReactionCard(playerId) {
    return players.getPlayableReactiveCards(playerId).length > 0
  }

  function hasAnyHero(playerId) {
    const heroSlots = players.players[playerId]?.heroes || []
    return heroSlots.some(Boolean)
  }

  function finishGameIfBoardEmptyAfterCombat(attackerPlayerId, defenderPlayerId) {
    const attackerHasHeroes = hasAnyHero(attackerPlayerId)
    const defenderHasHeroes = hasAnyHero(defenderPlayerId)

    if (attackerHasHeroes && defenderHasHeroes) return false

    // Keep same winner priority as endTurn(): if active attacker has no heroes, defender wins.
    const winner = attackerHasHeroes ? attackerPlayerId : defenderPlayerId
    const ended = game.endGame(winner)
    return syncAdvanceResult(ended)
  }

  async function waitForReactionChoice(combatId) {
    while (true) {
      const active = getActiveCombatOrNull()
      if (!active || active.combatId !== combatId || combat.rollStep !== 'reaction_pending') {
        return []
      }
      if (!hasPlayableReactionCard(active.defenderPlayerId)) {
        return []
      }
      const response = combat.consumeReactionResponse(combatId)
      if (response !== undefined) {
        if (response?.pass) return []
        if (response?.cardId) {
          return [{
            cardId: response.cardId,
            targetSlot: Number.isInteger(response?.targetSlot) ? response.targetSlot : null
          }]
        }
      }
      await sleep(60)
    }
  }

  async function resolveCombatAfterReaction(combatId) {
    const selectedReactionActions = await waitForReactionChoice(combatId)
    const active = getActiveCombatOrNull()
    if (!active || active.combatId !== combatId) return false

    combat.closeReactionWindow(combatId)

    const resolved = players.resolveCombatAsHost({
      attackerPlayerId: active.attackerPlayerId,
      attackerSlot: active.attackerSlot,
      defenderPlayerId: active.defenderPlayerId,
      defenderSlot: active.defenderSlot,
      attackerRoll: active.attackerRoll,
      defenderRoll: active.defenderRoll,
      damageRoll: active.damageRoll,
      damageDieSides: Number(active.attackerDamageDieSides) || DEFAULT_DAMAGE_DIE_SIDES,
      criticalBonus: COMBAT_CRITICAL_BONUS,
      reactionActions: selectedReactionActions,
      rollCounterAttack: randomD20,
      rollCounterDefense: randomD20
    })

    if (!resolved) {
      combat.clearRoll(combatId)
      return false
    }

    const resultPayload = {
      combatId,
      attackerPlayerId: active.attackerPlayerId,
      attackerSlot: active.attackerSlot,
      defenderPlayerId: active.defenderPlayerId,
      defenderSlot: active.defenderSlot,
      baseDamage: active.baseDamage,
      ...resolved
    }

    combat.finishRoll(resultPayload)
    sendMessage({
      type: 'combat_roll_result',
      payload: resultPayload
    })
    finishGameIfBoardEmptyAfterCombat(active.attackerPlayerId, active.defenderPlayerId)
    return true
  }

  async function runCombatAsHost({ attackerPlayerId, attackerSlot, defenderSlot }) {
    if (!connection.isHost) return false
    const safeAttackerSlot = toValidSlotIndex(attackerSlot)
    const safeDefenderSlot = toValidSlotIndex(defenderSlot)
    if (safeAttackerSlot === null || safeDefenderSlot === null) return false
    if (!canRunCombat(attackerPlayerId, safeAttackerSlot, safeDefenderSlot)) return false

    const defenderPlayerId = getOpponentPlayerId(attackerPlayerId)
    const attackerHero = players.players[attackerPlayerId].heroes[safeAttackerSlot]
    const defenderHero = players.players[defenderPlayerId].heroes[safeDefenderSlot]
    const attackerStats = players.getHeroCombatStats(attackerHero)
    const defenderStats = players.getHeroCombatStats(defenderHero)

    const combatId = `combat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const rollStartPayload = {
      combatId,
      attackerPlayerId,
      attackerSlot: safeAttackerSlot,
      defenderPlayerId,
      defenderSlot: safeDefenderSlot,
      attackerStat: attackerStats.atk,
      defenderStat: defenderStats.ac,
      defenderArmor: defenderStats.def,
      attackerDamageDieSides: normalizeDamageDieSides(attackerStats.damageDieSides),
      startedAt: Date.now()
    }

    combat.startCombatContext(rollStartPayload)
    sendMessage({
      type: 'combat_roll_start',
      payload: rollStartPayload
    })
    return true
  }

  async function attackHero(attackerSlot, defenderSlot) {
    const safeAttackerSlot = toValidSlotIndex(attackerSlot)
    const safeDefenderSlot = toValidSlotIndex(defenderSlot)
    if (safeAttackerSlot === null || safeDefenderSlot === null) return false
    const attackerPlayerId = myPlayerId.value
    if (!canRunCombat(attackerPlayerId, safeAttackerSlot, safeDefenderSlot)) return false

    if (connection.isHost) {
      return runCombatAsHost({
        attackerPlayerId,
        attackerSlot: safeAttackerSlot,
        defenderSlot: safeDefenderSlot
      })
    }

    return sendMessage({
      type: 'combat_request',
      payload: {
        attackerSlot: safeAttackerSlot,
        defenderSlot: safeDefenderSlot
      }
    })
  }

  function handleCombatRequest(payload = {}) {
    if (!connection.isHost) return false
    const attackerPlayerId = 'player_b'
    const safeAttackerSlot = toValidSlotIndex(payload.attackerSlot)
    const safeDefenderSlot = toValidSlotIndex(payload.defenderSlot)
    if (safeAttackerSlot === null || safeDefenderSlot === null) return false
    if (!canRunCombat(attackerPlayerId, safeAttackerSlot, safeDefenderSlot)) return false
    void runCombatAsHost({
      attackerPlayerId,
      attackerSlot: safeAttackerSlot,
      defenderSlot: safeDefenderSlot
    })
    return true
  }

  function requestCombatRollClick(step) {
    const active = getActiveCombatOrNull()
    if (!active) return false
    if (step !== 'attacker' && step !== 'defender' && step !== 'damage') return false

    const payload = {
      combatId: active.combatId,
      step,
      byPlayerId: myPlayerId.value,
      clickedAt: Date.now()
    }

    if (connection.isHost) {
      return handleCombatRollClick(payload)
    }

    return sendMessage({
      type: 'combat_roll_click',
      payload
    })
  }

  async function processCombatRollClick(payload = {}) {
    if (!connection.isHost) return false
    const active = getActiveCombatOrNull()
    if (!active) return false
    const combatId = payload?.combatId
    const step = payload?.step
    const byPlayerId = payload?.byPlayerId
    if (combatId !== active.combatId) return false
    if (step !== 'attacker' && step !== 'defender' && step !== 'damage') return false
    if (game.turnPhase !== 'combat' || game.currentTurn !== active.attackerPlayerId) return false

    const attackerHero = players.players[active.attackerPlayerId]?.heroes?.[active.attackerSlot]
    const defenderHero = players.players[active.defenderPlayerId]?.heroes?.[active.defenderSlot]
    if (!attackerHero || !defenderHero) {
      combat.clearRoll(active.combatId)
      return false
    }

    if (step === 'attacker') {
      if (combat.rollStep !== 'attacker_pending') return false
      if (byPlayerId !== active.attackerPlayerId) return false
      if (active.rollingAttacker) return false
      const rollStartPayload = {
        combatId: active.combatId,
        step: 'attacker',
        startedAt: Date.now()
      }
      combat.markRollStepStart(rollStartPayload)
      sendMessage({ type: 'combat_roll_step_start', payload: rollStartPayload })
      await sleep(COMBAT_ROLL_ANIMATION_MS)

      const refreshed = getActiveCombatOrNull()
      if (!refreshed || refreshed.combatId !== active.combatId) return false
      if (combat.rollStep !== 'attacker_pending') return false
      if (!refreshed.rollingAttacker) return false

      const roll = randomDie(ATTACK_ROLL_DIE_SIDES)
      const stepPayload = {
        combatId: refreshed.combatId,
        step: 'attacker',
        roll,
        attackerTotal: (Number(refreshed.attackerStat) || 0) + roll
      }
      if (!combat.setRollStepResult(stepPayload)) return false
      sendMessage({ type: 'combat_roll_step_result', payload: stepPayload })
      return true
    }

    if (step === 'defender') {
      if (combat.rollStep !== 'defender_pending') return false
      if (byPlayerId !== active.defenderPlayerId) return false
      if (active.rollingDefender) return false
      const rollStartPayload = {
        combatId: active.combatId,
        step: 'defender',
        startedAt: Date.now()
      }
      combat.markRollStepStart(rollStartPayload)
      sendMessage({ type: 'combat_roll_step_start', payload: rollStartPayload })
      await sleep(COMBAT_ROLL_ANIMATION_MS)

      const refreshed = getActiveCombatOrNull()
      if (!refreshed || refreshed.combatId !== active.combatId) return false
      if (combat.rollStep !== 'defender_pending') return false
      if (!refreshed.rollingDefender) return false

      const roll = randomDie(DEFENSE_DIE_SIDES)
      const defenderTotal = (Number(refreshed.defenderStat) || 0) + roll
      const stepPayload = {
        combatId: refreshed.combatId,
        step: 'defender',
        roll,
        defenderTotal
      }
      if (!combat.setRollStepResult(stepPayload)) return false
      sendMessage({ type: 'combat_roll_step_result', payload: stepPayload })
      return true
    }

    if (combat.rollStep !== 'damage_pending') return false
    if (byPlayerId !== active.attackerPlayerId) return false
    if (active.rollingDamage) return false
    const rollStartPayload = {
      combatId: active.combatId,
      step: 'damage',
      startedAt: Date.now()
    }
    combat.markRollStepStart(rollStartPayload)
    sendMessage({ type: 'combat_roll_step_start', payload: rollStartPayload })
    await sleep(COMBAT_ROLL_ANIMATION_MS)

    const refreshed = getActiveCombatOrNull()
    if (!refreshed || refreshed.combatId !== active.combatId) return false
    if (combat.rollStep !== 'damage_pending') return false
    if (!refreshed.rollingDamage) return false

    const damageDieSides = normalizeDamageDieSides(refreshed.attackerDamageDieSides)
    const roll = randomDie(damageDieSides)
    const attackerRoll = Number(refreshed.attackerRoll) || 0
    const attackerTotal = Number(refreshed.attackerTotal) || ((Number(refreshed.attackerStat) || 0) + attackerRoll)
    const defenderTotal = Number(refreshed.defenderTotal) || ((Number(refreshed.defenderStat) || 0) + (Number(refreshed.defenderRoll) || 0))
    const isFumble = attackerRoll === 1
    const isCritical = attackerRoll === ATTACK_ROLL_DIE_SIDES
    const hitSuccess = attackerTotal >= defenderTotal
    let baseDamage = hitSuccess ? Math.max(0, (Number(refreshed.attackerStat) || 0) + roll - (Number(refreshed.defenderArmor) || 0)) : 0
    if (isFumble) {
      baseDamage = 0
    } else if (isCritical) {
      baseDamage += Math.max(1, Math.round((damageDieSides / 2) + COMBAT_CRITICAL_BONUS))
    }

    const stepPayload = {
      combatId: refreshed.combatId,
      step: 'damage',
      roll,
      baseDamage,
      hitSuccess,
      isCritical,
      isFumble
    }
    if (!combat.setRollStepResult(stepPayload)) return false
    sendMessage({ type: 'combat_roll_step_result', payload: stepPayload })

    const updated = getActiveCombatOrNull()
    if (!updated || updated.combatId !== refreshed.combatId) return false
    const reactionPayload = {
      combatId: updated.combatId,
      attackerPlayerId: updated.attackerPlayerId,
      defenderPlayerId: updated.defenderPlayerId,
      attackerRoll: updated.attackerRoll,
      defenderRoll: updated.defenderRoll,
      damageRoll: updated.damageRoll,
      baseDamage: updated.baseDamage,
      hitSuccess: Boolean(updated.hitSuccess),
      isCritical: updated.isCritical,
      isFumble: updated.isFumble,
      startedAt: Date.now()
    }
    combat.openReactionWindow(reactionPayload)
    sendMessage({
      type: 'combat_reaction_window_start',
      payload: reactionPayload
    })

    void resolveCombatAfterReaction(updated.combatId)
    return true
  }

  function handleCombatRollClick(payload = {}) {
    if (!connection.isHost) return false
    void processCombatRollClick(payload)
    return true
  }

  function receiveCombatRollStart(payload = {}) {
    combat.startCombatContext(payload)
  }

  function receiveCombatRollStepResult(payload = {}) {
    combat.setRollStepResult(payload)
  }

  function receiveCombatRollStepStart(payload = {}) {
    combat.markRollStepStart(payload)
  }

  function receiveCombatReactionWindowStart(payload = {}) {
    combat.openReactionWindow(payload)
  }

  function submitCombatReaction(cardId = null, targetSlot = null) {
    const window = combat.reactionWindow
    if (!window?.combatId) return false
    if (combat.rollStep !== 'reaction_pending') return false
    if (window.defenderPlayerId !== myPlayerId.value) return false

    let selectedCard = null
    if (cardId) {
      selectedCard = players.players[myPlayerId.value].hand.find((entry) => entry.id === cardId) || null
      const card = selectedCard
      if (!card || (card.type !== 'reactive' && card.type !== 'counterattack' && card.type !== 'healing')) return false
      const cost = Number(card.cost || 0)
      if (players.players[myPlayerId.value].resources < cost) return false
      if (card.type === 'healing') {
        if (!Number.isInteger(targetSlot)) return false
        if (!players.getHealingTargets(myPlayerId.value).includes(targetSlot)) return false
      }
    }

    if (connection.isHost) {
      const accepted = combat.setReactionResponse(window.combatId, {
        cardId: cardId || null,
        pass: !cardId,
        targetSlot: Number.isInteger(targetSlot) ? targetSlot : null
      })
      if (accepted) {
        if (selectedCard) {
          applyLocalReactionReveal(myPlayerId.value, selectedCard)
          broadcastReactionReveal(myPlayerId.value, selectedCard)
        }
        combat.closeReactionWindow(window.combatId)
      }
      return accepted
    }

    const sent = sendMessage({
      type: 'combat_reaction_response',
      payload: {
        combatId: window.combatId,
        defenderPlayerId: myPlayerId.value,
        cardId: cardId || null,
        pass: !cardId,
        targetSlot: Number.isInteger(targetSlot) ? targetSlot : null,
        respondedAt: Date.now()
      }
    })
    if (sent) {
      if (selectedCard) {
        applyLocalReactionReveal(myPlayerId.value, selectedCard)
      }
      combat.closeReactionWindow(window.combatId)
    }
    return sent
  }

  function handleCombatReactionResponse(payload = {}) {
    if (!connection.isHost) return false
    if (combat.rollStep !== 'reaction_pending') return false
    const window = combat.reactionWindow
    if (!window?.combatId) return false
    if (payload?.combatId !== window.combatId) return false
    if (payload?.defenderPlayerId !== window.defenderPlayerId) return false
    const accepted = combat.setReactionResponse(window.combatId, {
      cardId: payload?.cardId || null,
      pass: Boolean(payload?.pass),
      targetSlot: Number.isInteger(payload?.targetSlot) ? payload.targetSlot : null
    })
    if (accepted) {
      const reactionCardId = payload?.cardId || null
      if (reactionCardId) {
        const defenderPlayerId = payload?.defenderPlayerId
        const reactionCard = players.players[defenderPlayerId]?.hand?.find((entry) => entry.id === reactionCardId) || null
        if (reactionCard) {
          applyLocalReactionReveal(defenderPlayerId, reactionCard)
          broadcastReactionReveal(defenderPlayerId, reactionCard)
        }
      }
      combat.closeReactionWindow(window.combatId)
    }
    return accepted
  }

  function receiveCombatRollResult(payload = {}) {
    players.applyCombatResult(payload)
    combat.finishRoll(payload)
  }

  return {
    advancePhase,
    discardSelectedHand,
    playHeroToSlot,
    playItemToSlot,
    playHealingToSlot,
    setHoveredCard,
    clearHoveredCard,
    attackHero,
    requestCombatRollClick,
    submitCombatReaction,
    handleAdvancePhaseRequest,
    handleDiscardRequest,
    handleCombatRequest,
    handleCombatRollClick,
    handleCombatReactionResponse,
    receiveCombatRollStart,
    receiveCombatRollStepStart,
    receiveCombatRollStepResult,
    receiveCombatReactionWindowStart,
    receiveCombatRollResult
  }
}
