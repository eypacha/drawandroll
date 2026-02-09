<template>
  <aside v-if="active" class="absolute right-4 top-1/2 z-[170] w-32 -translate-y-1/2 p-3">
    <div class="space-y-3">
      <section class="p-2">
        <button
          type="button"
          class="h-20 w-full border text-2xl font-black transition-colors"
          :class="opponentDieClass"
          :disabled="!canClickOpponentDie"
          @click="onClickOpponentDie"
        >
          {{ opponentRollDisplay }}
        </button>
        <div v-if="opponentFormula" class="mt-2 text-xs text-gray-700">
          {{ opponentFormula }}
        </div>
      </section>

      <section class="p-2">
        <button
          type="button"
          class="h-20x` w-full border text-2xl font-black transition-colors"
          :class="ownDieClass"
          :disabled="!canClickOwnDie"
          @click="onClickOwnDie"
        >
          {{ ownRollDisplay }}
        </button>
        <div v-if="ownFormula" class="mt-2 text-xs text-gray-700">
          {{ ownFormula }}
        </div>
      </section>

      <section class="rounded-md p-2 text-xs text-gray-700">
        <div class="font-semibold">{{ damageFormulaLabel }}</div>
        <div class="mt-2 text-[11px] text-gray-600">
          {{ statusLabel }}
        </div>
        <div v-if="showCritical" class="mt-2 inline-block bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
          {{ t('combat.critical') }}
        </div>
        <div v-if="showFumble" class="mt-2 inline-block bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
          {{ t('combat.fumble') }}
        </div>
        <div v-if="showReactiveUsed" class="mt-2 text-[11px] text-blue-700">
          {{ t('combat.reactiveUsed') }}: {{ reactiveEffectLabel }}
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
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCombatStore, useConnectionStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'

const combat = useCombatStore()
const connection = useConnectionStore()
const gameActions = useGameActions()
const { t } = useI18n()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const active = computed(() => combat.activeRoll)
const animatedOpponentRoll = ref(null)
const animatedOwnRoll = ref(null)
const ownRollStartedAt = ref(0)
const opponentRollStartedAt = ref(0)
const MIN_ROLL_ANIMATION_MS = 550
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

const ownRollDisplay = computed(() => (
  animatedOwnRoll.value ?? getRoleRoll(myRole.value) ?? t('combat.dieIdle')
))

const opponentRollDisplay = computed(() => (
  animatedOpponentRoll.value ?? getRoleRoll(opponentRole.value) ?? t('combat.dieIdle')
))

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
    return `${t('combat.damage')}: ? + ? = ?`
  }
  return `${t('combat.damage')}: ${baseDamageDisplay.value} + ${damageModifier.value} = ${finalDamageDisplay.value}`
})

const showCritical = computed(() => Boolean(active.value?.isCritical))
const showFumble = computed(() => Boolean(active.value?.isFumble))
const showReactiveUsed = computed(() => Boolean(active.value?.reactive?.effect))

const reactiveEffectLabel = computed(() => {
  const effect = active.value?.reactive?.effect
  if (!effect) return ''
  const key = `card.effects.${effect}`
  const translated = t(key)
  return translated === key ? effect : translated
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
  'border-blue-400 bg-blue-50 text-blue-700 cursor-pointer': canClickOwnDie.value,
  'border-gray-300 bg-white text-gray-900': !canClickOwnDie.value,
  'opacity-70 cursor-not-allowed': !canClickOwnDie.value
}))

const opponentDieClass = computed(() => ({
  'border-emerald-400 bg-emerald-50 text-emerald-700 cursor-pointer': canClickOpponentDie.value,
  'border-gray-300 bg-white text-gray-900': !canClickOpponentDie.value,
  'opacity-70 cursor-not-allowed': !canClickOpponentDie.value
}))

let clearTimer = null
let ownRollTimer = null
let opponentRollTimer = null
let ownRollStopTimer = null
let opponentRollStopTimer = null

function stopClearTimer() {
  if (!clearTimer) return
  clearTimeout(clearTimer)
  clearTimer = null
}

function randomDie() {
  return Math.floor(Math.random() * 20) + 1
}

function stopOwnRollAnimation() {
  if (ownRollStopTimer) {
    clearTimeout(ownRollStopTimer)
    ownRollStopTimer = null
  }
  if (ownRollTimer) {
    clearInterval(ownRollTimer)
    ownRollTimer = null
  }
  animatedOwnRoll.value = null
  ownRollStartedAt.value = 0
}

function stopOpponentRollAnimation() {
  if (opponentRollStopTimer) {
    clearTimeout(opponentRollStopTimer)
    opponentRollStopTimer = null
  }
  if (opponentRollTimer) {
    clearInterval(opponentRollTimer)
    opponentRollTimer = null
  }
  animatedOpponentRoll.value = null
  opponentRollStartedAt.value = 0
}

function startOwnRollAnimation() {
  stopOwnRollAnimation()
  animatedOwnRoll.value = randomDie()
  ownRollStartedAt.value = Date.now()
  ownRollTimer = setInterval(() => {
    animatedOwnRoll.value = randomDie()
  }, 65)
}

function startOpponentRollAnimation() {
  stopOpponentRollAnimation()
  animatedOpponentRoll.value = randomDie()
  opponentRollStartedAt.value = Date.now()
  opponentRollTimer = setInterval(() => {
    animatedOpponentRoll.value = randomDie()
  }, 65)
}

function stopOwnRollAnimationWithMinDuration() {
  if (!ownRollStartedAt.value) {
    stopOwnRollAnimation()
    return
  }
  const elapsed = Date.now() - ownRollStartedAt.value
  const remaining = Math.max(0, MIN_ROLL_ANIMATION_MS - elapsed)
  if (remaining === 0) {
    stopOwnRollAnimation()
    return
  }
  if (ownRollStopTimer) clearTimeout(ownRollStopTimer)
  ownRollStopTimer = setTimeout(() => {
    stopOwnRollAnimation()
  }, remaining)
}

function stopOpponentRollAnimationWithMinDuration() {
  if (!opponentRollStartedAt.value) {
    stopOpponentRollAnimation()
    return
  }
  const elapsed = Date.now() - opponentRollStartedAt.value
  const remaining = Math.max(0, MIN_ROLL_ANIMATION_MS - elapsed)
  if (remaining === 0) {
    stopOpponentRollAnimation()
    return
  }
  if (opponentRollStopTimer) clearTimeout(opponentRollStopTimer)
  opponentRollStopTimer = setTimeout(() => {
    stopOpponentRollAnimation()
  }, remaining)
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
  stopOwnRollAnimation()
  stopOpponentRollAnimation()
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

watch(
  () => active.value?.attackerRoll,
  (nextRoll) => {
    if (nextRoll === null || nextRoll === undefined) return
    if (myRole.value === 'attacker') stopOwnRollAnimationWithMinDuration()
    if (opponentRole.value === 'attacker') stopOpponentRollAnimationWithMinDuration()
  }
)

watch(
  () => active.value?.defenderRoll,
  (nextRoll) => {
    if (nextRoll === null || nextRoll === undefined) return
    if (myRole.value === 'defender') stopOwnRollAnimationWithMinDuration()
    if (opponentRole.value === 'defender') stopOpponentRollAnimationWithMinDuration()
  }
)

watch(
  () => isRoleRolling(myRole.value),
  (isRollingNow) => {
    if (isRollingNow) {
      startOwnRollAnimation()
    }
  }
)

watch(
  () => isRoleRolling(opponentRole.value),
  (isRollingNow) => {
    if (isRollingNow) {
      startOpponentRollAnimation()
    }
  }
)

watch(
  () => active.value?.combatId,
  () => {
    stopOwnRollAnimation()
    stopOpponentRollAnimation()
  }
)
</script>
