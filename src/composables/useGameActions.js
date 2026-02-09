import { computed } from 'vue'
import { useCombatStore, useConnectionStore, useDeckStore, useGameStore, usePlayersStore } from '@/stores'
import { sendMessage } from '@/services/peerService'

const COMBAT_ROLLING_MS = 1200
const COMBAT_CRITICAL_BONUS = 2

export function useGameActions() {
  const connection = useConnectionStore()
  const game = useGameStore()
  const players = usePlayersStore()
  const deck = useDeckStore()
  const combat = useCombatStore()
  const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')

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

  function setHoveredCard(cardId) {
    if (!game.isPlaying) return false
    players.setHoveredCard(myPlayerId.value, cardId)
    sendMessage({
      type: 'hover_card',
      payload: { playerId: myPlayerId.value, cardId }
    })
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

  function canRunCombat(attackerPlayerId, attackerSlot, defenderSlot) {
    if (combat.isRolling) return false
    if (game.turnPhase !== 'combat') return false
    if (game.currentTurn !== attackerPlayerId) return false
    if (!players.canHeroAttack(attackerPlayerId, attackerSlot)) return false
    const defenderPlayerId = getOpponentPlayerId(attackerPlayerId)
    const defenderHero = players.players[defenderPlayerId].heroes[defenderSlot]
    return Boolean(defenderHero)
  }

  function randomD20() {
    return Math.floor(Math.random() * 20) + 1
  }

  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function runCombatAsHost({ attackerPlayerId, attackerSlot, defenderSlot }) {
    if (!connection.isHost) return false

    const safeAttackerSlot = toValidSlotIndex(attackerSlot)
    const safeDefenderSlot = toValidSlotIndex(defenderSlot)
    if (safeAttackerSlot === null || safeDefenderSlot === null) return false
    if (!canRunCombat(attackerPlayerId, safeAttackerSlot, safeDefenderSlot)) return false

    const defenderPlayerId = getOpponentPlayerId(attackerPlayerId)
    const combatId = `combat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const rollStartPayload = {
      combatId,
      attackerPlayerId,
      attackerSlot: safeAttackerSlot,
      defenderPlayerId,
      defenderSlot: safeDefenderSlot,
      rollingMs: COMBAT_ROLLING_MS,
      startedAt: Date.now()
    }

    combat.startRoll(rollStartPayload)
    sendMessage({
      type: 'combat_roll_start',
      payload: rollStartPayload
    })

    await sleep(COMBAT_ROLLING_MS)

    if (combat.activeRoll?.combatId !== combatId) {
      return false
    }
    if (game.turnPhase !== 'combat' || game.currentTurn !== attackerPlayerId) {
      combat.clearRoll(combatId)
      return false
    }

    const attackerRoll = randomD20()
    const defenderRoll = randomD20()
    const resolved = players.resolveCombatAsHost({
      attackerPlayerId,
      attackerSlot: safeAttackerSlot,
      defenderPlayerId,
      defenderSlot: safeDefenderSlot,
      attackerRoll,
      defenderRoll,
      criticalBonus: COMBAT_CRITICAL_BONUS
    })

    if (!resolved) {
      combat.clearRoll(combatId)
      return false
    }

    const resultPayload = {
      combatId,
      attackerPlayerId,
      attackerSlot: safeAttackerSlot,
      defenderPlayerId,
      defenderSlot: safeDefenderSlot,
      ...resolved
    }

    combat.finishRoll(resultPayload)
    sendMessage({
      type: 'combat_roll_result',
      payload: resultPayload
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

  function receiveCombatRollStart(payload = {}) {
    combat.startRoll(payload)
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
    setHoveredCard,
    clearHoveredCard,
    attackHero,
    handleAdvancePhaseRequest,
    handleDiscardRequest,
    handleCombatRequest,
    receiveCombatRollStart,
    receiveCombatRollResult
  }
}
