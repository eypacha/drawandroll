import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Combat Store
 * Keeps the currently running combat sequence and dice animation state.
 */
export const useCombatStore = defineStore('combat', () => {
  const activeRoll = ref(null)
  const reactionWindow = ref(null)
  const reactionResponses = ref({})

  const isActive = computed(() => activeRoll.value !== null)
  const isRolling = computed(() => Boolean(activeRoll.value?.isRolling))
  const isReactionOpen = computed(() => Boolean(reactionWindow.value))

  function startRoll(payload = {}) {
    const combatId = payload.combatId || `combat-${Date.now()}`
    activeRoll.value = {
      combatId,
      attackerPlayerId: payload.attackerPlayerId || null,
      attackerSlot: Number(payload.attackerSlot),
      defenderPlayerId: payload.defenderPlayerId || null,
      defenderSlot: Number(payload.defenderSlot),
      rollingMs: Number(payload.rollingMs) || 1200,
      startedAt: Number(payload.startedAt) || Date.now(),
      isRolling: true,
      attackerRoll: null,
      defenderRoll: null,
      attackerTotal: null,
      defenderTotal: null,
      damage: null,
      isCritical: false,
      isFumble: false,
      defenderHpBefore: null,
      defenderHpAfter: null,
      defenderDefeated: false
    }
  }

  function finishRoll(payload = {}) {
    if (!activeRoll.value || activeRoll.value.combatId !== payload.combatId) {
      startRoll(payload)
    }

    if (!activeRoll.value) return

    activeRoll.value = {
      ...activeRoll.value,
      attackerRoll: Number(payload.attackerRoll) || 0,
      defenderRoll: Number(payload.defenderRoll) || 0,
      attackerTotal: Number(payload.attackerTotal) || 0,
      defenderTotal: Number(payload.defenderTotal) || 0,
      damage: Number(payload.damage) || 0,
      isCritical: Boolean(payload.isCritical),
      isFumble: Boolean(payload.isFumble),
      defenderHpBefore: Number(payload.defenderHpBefore ?? 0),
      defenderHpAfter: Number(payload.defenderHpAfter ?? 0),
      defenderDefeated: Boolean(payload.defenderDefeated),
      isRolling: false,
      finishedAt: Date.now()
    }
    reactionWindow.value = null
    reactionResponses.value = {}
  }

  function openReactionWindow(payload = {}) {
    reactionWindow.value = {
      combatId: payload.combatId || null,
      attackerPlayerId: payload.attackerPlayerId || null,
      defenderPlayerId: payload.defenderPlayerId || null,
      attackerRoll: Number(payload.attackerRoll) || 0,
      defenderRoll: Number(payload.defenderRoll) || 0,
      baseDamage: Number(payload.baseDamage) || 0,
      isCritical: Boolean(payload.isCritical),
      isFumble: Boolean(payload.isFumble),
      startedAt: Number(payload.startedAt) || Date.now()
    }
  }

  function closeReactionWindow(expectedCombatId = null) {
    if (!reactionWindow.value) return
    if (expectedCombatId && reactionWindow.value.combatId !== expectedCombatId) return
    reactionWindow.value = null
  }

  function setReactionResponse(combatId, cardId = null) {
    if (!combatId) return false
    reactionResponses.value[combatId] = { cardId: cardId || null, receivedAt: Date.now() }
    return true
  }

  function consumeReactionResponse(combatId) {
    if (!combatId) return undefined
    if (!(combatId in reactionResponses.value)) return undefined
    const response = reactionResponses.value[combatId]
    delete reactionResponses.value[combatId]
    return response
  }

  function clearRoll(expectedCombatId = null) {
    if (!activeRoll.value) return
    if (expectedCombatId && activeRoll.value.combatId !== expectedCombatId) return
    activeRoll.value = null
    reactionWindow.value = null
    reactionResponses.value = {}
  }

  function $reset() {
    activeRoll.value = null
    reactionWindow.value = null
    reactionResponses.value = {}
  }

  return {
    activeRoll,
    reactionWindow,
    isActive,
    isRolling,
    isReactionOpen,
    startRoll,
    finishRoll,
    openReactionWindow,
    closeReactionWindow,
    setReactionResponse,
    consumeReactionResponse,
    clearRoll,
    $reset
  }
})
