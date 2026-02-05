import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Combat Store
 * Manages combat state: attacker, defender, dice roll, reaction window
 */
export const useCombatStore = defineStore('combat', () => {
  // State
  const attacker = ref(null) // hero object
  const defender = ref(null) // hero object
  const phase = ref(null) // null | 'declaration' | 'roll' | 'modifiers' | 'reaction' | 'resolution' | 'cleanup'
  const roll = ref(null) // 1-20
  const reactionPlayed = ref(null) // reactive card or null

  // Getters
  const isActive = computed(() => phase.value !== null)
  const isCritical = computed(() => roll.value === 20)
  const isCriticalFail = computed(() => roll.value === 1)

  // Actions
  function declareAttack(attackerHero, defenderHero) {
    attacker.value = attackerHero
    defender.value = defenderHero
    phase.value = 'declaration'
  }

  function rollDice() {
    roll.value = Math.floor(Math.random() * 20) + 1
    phase.value = 'roll'
  }

  function $reset() {
    attacker.value = null
    defender.value = null
    phase.value = null
    roll.value = null
    reactionPlayed.value = null
  }

  return {
    // State
    attacker,
    defender,
    phase,
    roll,
    reactionPlayed,
    // Getters
    isActive,
    isCritical,
    isCriticalFail,
    // Actions
    declareAttack,
    rollDice,
    $reset
  }
})
