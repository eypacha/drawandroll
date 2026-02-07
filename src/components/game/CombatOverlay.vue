<template>
  <div
    v-if="combat.activeRoll"
    class="pointer-events-none absolute inset-0 z-[180] flex items-center justify-center p-4"
  >
    <div class="w-full max-w-md border border-gray-300 bg-white shadow-xl">
      <div class="border-b border-gray-200 px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-gray-800">
        {{ headline }}
      </div>

      <div class="grid grid-cols-2 gap-3 p-4">
        <div class="border border-gray-300 bg-gray-50 p-3 text-center">
          <div class="text-[11px] uppercase tracking-wide text-gray-600">
            {{ t('combat.attackerDie') }}
          </div>
          <div class="mt-2 text-4xl font-black text-gray-900" :class="{ 'animate-pulse': combat.isRolling }">
            {{ attackerDieDisplay }}
          </div>
          <div v-if="!combat.isRolling" class="mt-1 text-xs text-gray-600">
            {{ t('combat.total') }}: {{ combat.activeRoll.attackerTotal }}
          </div>
        </div>

        <div class="border border-gray-300 bg-gray-100 p-3 text-center">
          <div class="text-[11px] uppercase tracking-wide text-gray-600">
            {{ t('combat.defenderDie') }}
          </div>
          <div class="mt-2 text-4xl font-black text-gray-900" :class="{ 'animate-pulse': combat.isRolling }">
            {{ defenderDieDisplay }}
          </div>
          <div v-if="!combat.isRolling" class="mt-1 text-xs text-gray-600">
            {{ t('combat.total') }}: {{ combat.activeRoll.defenderTotal }}
          </div>
        </div>
      </div>

      <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <template v-if="combat.isRolling">
          {{ t('combat.rollingHint') }}
        </template>
        <template v-else>
          <span class="font-semibold">{{ t('combat.damage') }}:</span>
          {{ combat.activeRoll.damage }}
          <span v-if="combat.activeRoll.isCritical" class="ml-2 bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
            {{ t('combat.critical') }}
          </span>
          <span v-if="combat.activeRoll.isFumble" class="ml-2 bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
            {{ t('combat.fumble') }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCombatStore, useConnectionStore } from '@/stores'

const combat = useCombatStore()
const connection = useConnectionStore()
const { t } = useI18n()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const attackerDieDisplay = ref(1)
const defenderDieDisplay = ref(1)
let rollingTimer = null
let clearTimer = null

const headline = computed(() => {
  if (!combat.activeRoll) return ''
  const iAmAttacker = combat.activeRoll.attackerPlayerId === myPlayerId.value
  if (combat.isRolling) {
    return iAmAttacker ? t('combat.yourAttackRolling') : t('combat.opponentAttackRolling')
  }
  return iAmAttacker ? t('combat.yourAttackResult') : t('combat.opponentAttackResult')
})

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

onUnmounted(() => {
  stopRollingAnimation()
  stopClearTimer()
})
</script>
