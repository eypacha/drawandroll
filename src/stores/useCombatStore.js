import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Combat Store
 * Keeps combat state for a sequential roll flow:
 * attacker click -> defender click -> defensive reaction -> final resolve.
 */
export const useCombatStore = defineStore('combat', () => {
  const activeRoll = ref(null)
  const rollStep = ref('idle')
  const pendingCombatContext = ref(null)
  const reactionWindow = ref(null)
  const reactionResponses = ref({})

  const isActive = computed(() => rollStep.value !== 'idle')
  const isRolling = computed(() => rollStep.value !== 'idle')
  const isReactionOpen = computed(() => rollStep.value === 'reaction_pending' && Boolean(reactionWindow.value))

  function startCombatContext(payload = {}) {
    const combatId = payload.combatId || `combat-${Date.now()}`
    const attackerStat = Number(payload.attackerStat) || 0
    const defenderStat = Number(payload.defenderStat) || 0

    activeRoll.value = {
      combatId,
      attackerPlayerId: payload.attackerPlayerId || null,
      attackerSlot: Number(payload.attackerSlot),
      defenderPlayerId: payload.defenderPlayerId || null,
      defenderSlot: Number(payload.defenderSlot),
      attackerStat,
      defenderStat,
      attackerRoll: null,
      defenderRoll: null,
      rollingAttacker: false,
      rollingDefender: false,
      attackerTotal: null,
      defenderTotal: null,
      baseDamage: null,
      damage: null,
      isCritical: false,
      isFumble: false,
      defenderHpBefore: null,
      defenderHpAfter: null,
      defenderDefeated: false,
      reactive: null,
      startedAt: Number(payload.startedAt) || Date.now()
    }

    pendingCombatContext.value = {
      combatId,
      attackerPlayerId: payload.attackerPlayerId || null,
      attackerSlot: Number(payload.attackerSlot),
      defenderPlayerId: payload.defenderPlayerId || null,
      defenderSlot: Number(payload.defenderSlot),
      attackerStat,
      defenderStat
    }
    rollStep.value = 'attacker_pending'
    reactionWindow.value = null
    reactionResponses.value = {}
  }

  function setRollStepResult(payload = {}) {
    if (!activeRoll.value || activeRoll.value.combatId !== payload.combatId) return false
    const step = payload.step
    if (step !== 'attacker' && step !== 'defender') return false

    if (step === 'attacker' && rollStep.value === 'attacker_pending') {
      activeRoll.value = {
        ...activeRoll.value,
        rollingAttacker: false,
        attackerRoll: Number(payload.roll) || 0,
        attackerTotal: Number(payload.attackerTotal) || 0
      }
      rollStep.value = 'defender_pending'
      return true
    }

    if (step === 'defender' && rollStep.value === 'defender_pending') {
      activeRoll.value = {
        ...activeRoll.value,
        rollingDefender: false,
        defenderRoll: Number(payload.roll) || 0,
        defenderTotal: Number(payload.defenderTotal) || 0,
        baseDamage: Number(payload.baseDamage) || 0,
        isCritical: Boolean(payload.isCritical),
        isFumble: Boolean(payload.isFumble)
      }
      rollStep.value = 'reaction_pending'
      return true
    }

    return false
  }

  function markRollStepStart(payload = {}) {
    if (!activeRoll.value || activeRoll.value.combatId !== payload.combatId) return false
    const step = payload.step
    if (step !== 'attacker' && step !== 'defender') return false

    if (step === 'attacker' && rollStep.value === 'attacker_pending') {
      activeRoll.value = {
        ...activeRoll.value,
        rollingAttacker: true
      }
      return true
    }

    if (step === 'defender' && rollStep.value === 'defender_pending') {
      activeRoll.value = {
        ...activeRoll.value,
        rollingDefender: true
      }
      return true
    }

    return false
  }

  function openReactionWindow(payload = {}) {
    if (!activeRoll.value || activeRoll.value.combatId !== payload.combatId) return false
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
    rollStep.value = 'reaction_pending'
    return true
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

  function finishRoll(payload = {}) {
    if (!activeRoll.value || activeRoll.value.combatId !== payload.combatId) return false
    activeRoll.value = {
      ...activeRoll.value,
      attackerRoll: Number(payload.attackerRoll) || 0,
      defenderRoll: Number(payload.defenderRoll) || 0,
      rollingAttacker: false,
      rollingDefender: false,
      attackerTotal: Number(payload.attackerTotal) || 0,
      defenderTotal: Number(payload.defenderTotal) || 0,
      baseDamage: Number(payload.baseDamage ?? activeRoll.value.baseDamage ?? 0),
      damage: Number(payload.damage) || 0,
      isCritical: Boolean(payload.isCritical),
      isFumble: Boolean(payload.isFumble),
      defenderHpBefore: Number(payload.defenderHpBefore ?? 0),
      defenderHpAfter: Number(payload.defenderHpAfter ?? 0),
      defenderDefeated: Boolean(payload.defenderDefeated),
      reactive: payload.reactive || null,
      finishedAt: Date.now()
    }
    pendingCombatContext.value = null
    reactionWindow.value = null
    reactionResponses.value = {}
    rollStep.value = 'resolved'
    return true
  }

  function clearRoll(expectedCombatId = null) {
    if (expectedCombatId && activeRoll.value?.combatId !== expectedCombatId) return
    activeRoll.value = null
    pendingCombatContext.value = null
    reactionWindow.value = null
    reactionResponses.value = {}
    rollStep.value = 'idle'
  }

  function $reset() {
    clearRoll()
  }

  return {
    activeRoll,
    rollStep,
    pendingCombatContext,
    reactionWindow,
    isActive,
    isRolling,
    isReactionOpen,
    startCombatContext,
    setRollStepResult,
    markRollStepStart,
    openReactionWindow,
    closeReactionWindow,
    setReactionResponse,
    consumeReactionResponse,
    finishRoll,
    clearRoll,
    $reset
  }
})
