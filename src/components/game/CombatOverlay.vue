<template>
  <div
    v-if="combat.activeRoll"
    class="pointer-events-none absolute inset-0 z-[180] flex items-center justify-center p-4"
  >
    <div
      class="w-full max-w-md border border-gray-300 bg-white shadow-xl"
      :class="isMyReactionWindow ? 'pointer-events-auto' : 'pointer-events-none'"
    >
      <div class="border-b border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-gray-800">
        {{ headline }}
      </div>

      <div class="grid grid-cols-2 gap-3 p-4">
        <div class="border border-gray-300 bg-gray-50 p-3 text-center">
          <div class="text-[11px] uppercase tracking-wide text-gray-600">
            {{ t('combat.attackerDie') }}
          </div>
          <div class="mt-2 text-4xl font-black text-gray-900" :class="{ 'animate-pulse': combat.isRolling && !combat.isReactionOpen }">
            {{ attackerDieDisplay }}
          </div>
          <div v-if="!combat.isRolling || combat.isReactionOpen" class="mt-1 text-xs text-gray-600">
            {{ t('combat.total') }}: {{ displayedAttackerTotal }}
          </div>
        </div>

        <div class="border border-gray-300 bg-gray-100 p-3 text-center">
          <div class="text-[11px] uppercase tracking-wide text-gray-600">
            {{ t('combat.defenderDie') }}
          </div>
          <div class="mt-2 text-4xl font-black text-gray-900" :class="{ 'animate-pulse': combat.isRolling && !combat.isReactionOpen }">
            {{ defenderDieDisplay }}
          </div>
          <div v-if="!combat.isRolling || combat.isReactionOpen" class="mt-1 text-xs text-gray-600">
            {{ t('combat.total') }}: {{ displayedDefenderTotal }}
          </div>
        </div>
      </div>

      <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <template v-if="combat.isRolling && !combat.isReactionOpen">
          {{ t('combat.rollingHint') }}
        </template>
        <template v-else>
          <span class="font-semibold">{{ t('combat.damage') }}:</span>
          {{ displayedDamage }}
          <span v-if="displayedIsCritical" class="ml-2 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {{ t('combat.critical') }}
          </span>
          <span v-if="displayedIsFumble" class="ml-2 bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {{ t('combat.fumble') }}
          </span>
        </template>
      </div>
      <div v-if="isMyReactionWindow" class="border-t border-gray-200 bg-white px-4 py-3">
        <div class="text-xs text-gray-700">
          {{ t('combat.reactionHint') }}
        </div>
        <div class="mt-2 flex justify-end">
          <button
            class="rounded-md bg-gray-900 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-800"
            @click="passReaction"
          >
            {{ t('combat.passReaction') }}
          </button>
        </div>
      </div>
    </div>
  </div>
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
const attackerDieDisplay = ref(1)
const defenderDieDisplay = ref(1)
let rollingTimer = null
let clearTimer = null

const headline = computed(() => {
  if (!combat.activeRoll) return ''
  const iAmAttacker = combat.activeRoll.attackerPlayerId === myPlayerId.value
  if (combat.isReactionOpen) {
    return t('combat.reactionHint')
  }
  if (combat.isRolling) {
    return iAmAttacker ? t('combat.yourAttackRolling') : t('combat.opponentAttackRolling')
  }
  return iAmAttacker ? t('combat.yourAttackResult') : t('combat.opponentAttackResult')
})

const isMyReactionWindow = computed(() => (
  combat.isReactionOpen && combat.reactionWindow?.defenderPlayerId === myPlayerId.value
))
const displayedAttackerTotal = computed(() => {
  if (!combat.activeRoll) return 0
  if (combat.isReactionOpen && combat.reactionWindow) {
    return Number(combat.reactionWindow.attackerRoll || 0)
  }
  return Number(combat.activeRoll.attackerTotal || 0)
})
const displayedDefenderTotal = computed(() => {
  if (!combat.activeRoll) return 0
  if (combat.isReactionOpen && combat.reactionWindow) {
    return Number(combat.reactionWindow.defenderRoll || 0)
  }
  return Number(combat.activeRoll.defenderTotal || 0)
})
const displayedDamage = computed(() => (
  combat.isReactionOpen ? Number(combat.reactionWindow?.baseDamage || 0) : Number(combat.activeRoll?.damage || 0)
))
const displayedIsCritical = computed(() => (
  combat.isReactionOpen ? Boolean(combat.reactionWindow?.isCritical) : Boolean(combat.activeRoll?.isCritical)
))
const displayedIsFumble = computed(() => (
  combat.isReactionOpen ? Boolean(combat.reactionWindow?.isFumble) : Boolean(combat.activeRoll?.isFumble)
))

function randomDie() {
  return Math.floor(Math.random() * 20) + 1
}

function stopRollingAnimation() {
  if (!rollingTimer) return
  clearInterval(rollingTimer)
  rollingTimer = null
}

function stopClearTimer() {
  if (!clearTimer) return
  clearTimeout(clearTimer)
  clearTimer = null
}

watch(
  () => combat.activeRoll,
  (nextRoll) => {
    stopClearTimer()
    if (!nextRoll) {
      stopRollingAnimation()
      return
    }

    if (nextRoll.isRolling) {
      if (combat.isReactionOpen) {
        stopRollingAnimation()
        attackerDieDisplay.value = Number(combat.reactionWindow?.attackerRoll || 0)
        defenderDieDisplay.value = Number(combat.reactionWindow?.defenderRoll || 0)
        return
      }
      stopRollingAnimation()
      attackerDieDisplay.value = randomDie()
      defenderDieDisplay.value = randomDie()
      rollingTimer = setInterval(() => {
        attackerDieDisplay.value = randomDie()
        defenderDieDisplay.value = randomDie()
      }, 90)
      return
    }

    stopRollingAnimation()
    attackerDieDisplay.value = Number(nextRoll.attackerRoll) || 0
    defenderDieDisplay.value = Number(nextRoll.defenderRoll) || 0
    clearTimer = setTimeout(() => {
      combat.clearRoll(nextRoll.combatId)
    }, 1800)
  },
  { deep: true }
)

watch(
  () => combat.reactionWindow,
  (nextWindow) => {
    if (!nextWindow) return
    attackerDieDisplay.value = Number(nextWindow.attackerRoll || 0)
    defenderDieDisplay.value = Number(nextWindow.defenderRoll || 0)
    stopRollingAnimation()
  },
  { deep: true }
)

onUnmounted(() => {
  stopRollingAnimation()
  stopClearTimer()
})

function passReaction() {
  if (!isMyReactionWindow.value) return
  gameActions.submitCombatReaction(null)
}
</script>
