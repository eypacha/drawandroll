<template>
  <aside v-if="active" class="absolute right-4 top-1/2 z-[170] w-32 -translate-y-1/2 p-3">
    <div class="space-y-3">
      <section class="p-2">
        <button
          type="button"
          class="h-24 w-full border transition-colors"
          :class="opponentDieClass"
          :disabled="!canClickOpponentDie"
          @click="onClickOpponentDie"
        >
          <div class="flex h-full w-full flex-col items-center justify-center gap-1 py-1">
            <div class="h-24 w-24">
              <ThreeDie
                :value="getRoleRoll(opponentRole)"
                :rolling="isRoleRolling(opponentRole)"
                tone="emerald"
              />
            </div>
          </div>
        </button>
        <div v-if="opponentFormula" class="text-center font-semibold">
          {{ opponentFormula }}
        </div>
      </section>

      <section class="p-2">
        <button
          type="button"
          class="h-24 w-full border transition-colors"
          :class="ownDieClass"
          :disabled="!canClickOwnDie"
          @click="onClickOwnDie"
        >
          <div class="flex h-full w-full flex-col items-center justify-center gap-1 py-1">
            <div class="h-24 w-24">
              <ThreeDie
                :value="getRoleRoll(myRole)"
                :rolling="isRoleRolling(myRole)"
                tone="blue"
              />
            </div>
          </div>
        </button>
        <div v-if="ownFormula" class="text-center font-semibold">
          {{ ownFormula }}
        </div>
      </section>

      <section class="rounded-md p-2 text-xs text-gray-700">
        <div v-if="damageFormulaLabel" class="font-semibold">{{ damageFormulaLabel }}</div>
        <div class="mt-2 text-[11px] text-gray-600">
          {{ statusLabel }}
        </div>
        <div v-if="showCritical" class="mt-2 inline-block bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          {{ t('combat.critical') }}
        </div>
        <div v-if="showFumble" class="mt-2 inline-block bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
          {{ t('combat.fumble') }}
        </div>
        <div v-if="lastReactionLabel" class="mt-2 text-[11px] text-blue-700">
          {{ lastReactionLabel }}
        </div>
        <div v-if="isMyReactionWindow" class="mt-2 flex justify-end">
          <button
            type="button"
            class="rounded bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
            @click="passReaction"
          >
            {{ t('combat.passReaction') }}
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<script setup>
import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCombatStore, useConnectionStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'
import ThreeDie from '@/components/game/ThreeDie.vue'

const combat = useCombatStore()
const connection = useConnectionStore()
const gameActions = useGameActions()
const { t } = useI18n()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const active = computed(() => combat.activeRoll)
const myRole = computed(() => {
  if (!active.value) return null
  if (active.value.attackerPlayerId === myPlayerId.value) return 'attacker'
  if (active.value.defenderPlayerId === myPlayerId.value) return 'defender'
  return null
})
const opponentRole = computed(() => {
  if (myRole.value === 'attacker') return 'defender'
  if (myRole.value === 'defender') return 'attacker'
  return null
})

const isMyReactionWindow = computed(() => (
  combat.isReactionOpen && combat.reactionWindow?.defenderPlayerId === myPlayerId.value
))

function getRoleStat(role) {
  if (role === 'attacker') return Number(active.value?.attackerStat || 0)
  if (role === 'defender') return Number(active.value?.defenderStat || 0)
  return 0
}

function getRoleRoll(role) {
  if (role === 'attacker') return active.value?.attackerRoll
  if (role === 'defender') return active.value?.defenderRoll
  return null
}

function getRoleTotal(role) {
  if (role === 'attacker') return active.value?.attackerTotal
  if (role === 'defender') return active.value?.defenderTotal
  return null
}

function isRoleClickable(role) {
  if (role === 'attacker') return combat.rollStep === 'attacker_pending' && myRole.value === 'attacker'
  if (role === 'defender') return combat.rollStep === 'defender_pending' && myRole.value === 'defender'
  return false
}

function isRoleRolling(role) {
  if (role === 'attacker') return Boolean(active.value?.rollingAttacker)
  if (role === 'defender') return Boolean(active.value?.rollingDefender)
  return false
}

const ownRollDisplay = computed(() => getRoleRoll(myRole.value) ?? t('combat.dieIdle'))

const opponentRollDisplay = computed(() => getRoleRoll(opponentRole.value) ?? t('combat.dieIdle'))

const ownFormula = computed(() => {
  const stat = getRoleStat(myRole.value)
  const roll = getRoleRoll(myRole.value)
  const total = getRoleTotal(myRole.value)
  if (roll === null || roll === undefined || total === null || total === undefined) return ''
  return `${stat} + ${roll} = ${total}`
})

const opponentFormula = computed(() => {
  const stat = getRoleStat(opponentRole.value)
  const roll = getRoleRoll(opponentRole.value)
  const total = getRoleTotal(opponentRole.value)
  if (roll === null || roll === undefined || total === null || total === undefined) return ''
  return `${stat} + ${roll} = ${total}`
})

const baseDamageDisplay = computed(() => Number(active.value?.baseDamage))
const finalDamageDisplay = computed(() => Number(active.value?.damage ?? active.value?.baseDamage))
const damageModifier = computed(() => {
  if (!Number.isFinite(baseDamageDisplay.value) || !Number.isFinite(finalDamageDisplay.value)) return null
  return finalDamageDisplay.value - baseDamageDisplay.value
})
const damageFormulaLabel = computed(() => {
  if (!Number.isFinite(baseDamageDisplay.value) || !Number.isFinite(finalDamageDisplay.value) || damageModifier.value === null) {
    return ''
  }
  return `${t('combat.damage')}: ${baseDamageDisplay.value} + ${damageModifier.value} = ${finalDamageDisplay.value}`
})

const showCritical = computed(() => Boolean(active.value?.isCritical))
const showFumble = computed(() => Boolean(active.value?.isFumble))
const lastReaction = computed(() => {
  const reactions = active.value?.reactions
  if (!Array.isArray(reactions) || reactions.length === 0) return null
  return reactions[reactions.length - 1]
})

const lastReactionLabel = computed(() => {
  const reaction = lastReaction.value
  if (!reaction) return ''
  if (reaction.type === 'healing') {
    return `${t('combat.healingUsed')}: +${reaction.appliedHeal} (slot ${Number(reaction.targetSlot) + 1})`
  }
  if (reaction.type === 'counterattack') {
    return `${t('card.types.counterattack')}: ${reaction.counterDamage} + ${reaction.counterAttackRoll} - ${reaction.counterDefenseRoll} = ${reaction.counterFinal}`
  }
  const effect = reaction.effect
  if (!effect) return ''
  const key = `card.effects.${effect}`
  const translated = t(key)
  return `${t('combat.reactiveUsed')}: ${translated === key ? effect : translated}`
})

const statusLabel = computed(() => {
  if (!active.value) return t('combat.statusIdle')
  if (combat.rollStep === 'attacker_pending') {
    return isRoleClickable('attacker')
      ? t('combat.statusRollAttacker')
      : t('combat.statusWaitAttacker')
  }
  if (combat.rollStep === 'defender_pending') {
    return isRoleClickable('defender')
      ? t('combat.statusRollDefender')
      : t('combat.statusWaitDefender')
  }
  if (combat.rollStep === 'reaction_pending') {
    return t('combat.statusWaitReaction')
  }
  if (combat.rollStep === 'resolved') return t('combat.statusResolved')
  return t('combat.statusIdle')
})

const canClickOwnDie = computed(() => isRoleClickable(myRole.value))
const canClickOpponentDie = computed(() => isRoleClickable(opponentRole.value))

const ownDieClass = computed(() => ({
  'border-blue-400 text-blue-700 cursor-pointer': canClickOwnDie.value,
  'border-transparent': !canClickOwnDie.value,
  'opacity-70 cursor-not-allowed': !canClickOwnDie.value
}))

const opponentDieClass = computed(() => ({
  'border-emerald-400 text-emerald-700 cursor-pointer': canClickOpponentDie.value,
  'border-transparent': !canClickOpponentDie.value,
  'opacity-70 cursor-not-allowed': !canClickOpponentDie.value
}))

let clearTimer = null

function stopClearTimer() {
  if (!clearTimer) return
  clearTimeout(clearTimer)
  clearTimer = null
}

watch(
  () => combat.rollStep,
  (nextStep) => {
    stopClearTimer()
    if (nextStep !== 'resolved') return
    clearTimer = setTimeout(() => {
      if (active.value?.combatId) {
        combat.clearRoll(active.value.combatId)
      } else {
        combat.clearRoll()
      }
    }, 1800)
  }
)

onUnmounted(() => {
  stopClearTimer()
})

function onClickOwnDie() {
  if (!canClickOwnDie.value) return
  gameActions.requestCombatRollClick(myRole.value)
}

function onClickOpponentDie() {
  if (!canClickOpponentDie.value) return
  gameActions.requestCombatRollClick(opponentRole.value)
}

function passReaction() {
  if (!isMyReactionWindow.value) return
  gameActions.submitCombatReaction(null)
}
</script>
