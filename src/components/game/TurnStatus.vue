<template>
  <div class="absolute bottom-0 right-0 py-3 px-4 font-semibold w-42 text-right z-101">
    <span v-if="isMyTurn">{{ t('turn.yourTurn') }}</span>
    <span v-else>{{ t('turn.opponentTurn') }}</span>
    <div class="text-xs font-normal opacity-80">
      {{ phaseLabel }}
    </div>
    <button
      v-if="isMyTurn && advanceLabel"
      class="mt-2 px-3 py-1 text-xs rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
      :disabled="combat.isRolling"
      :class="{ 'opacity-60 cursor-not-allowed': combat.isRolling }"
      @click="advance"
    >
      {{ advanceLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore, useConnectionStore, useCombatStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'

const game = useGameStore()
const connection = useConnectionStore()
const combat = useCombatStore()
const gameActions = useGameActions()
const { t } = useI18n()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const isMyTurn = computed(() => game.currentTurn === myPlayerId.value)
const phaseLabel = computed(() => {
  const map = {
    draw: t('turn.phase.draw'),
    recruit: t('turn.phase.recruit'),
    combat: t('turn.phase.combat'),
    end: t('turn.phase.end')
  }
  return map[game.turnPhase] || ''
})

const advanceLabel = computed(() => {
  if (game.turnPhase === 'combat') return t('turn.action.endTurn')
  if (game.turnPhase === 'recruit') {
    const isFirstPlayerOpeningTurn =
      game.turn === 1 && game.currentTurn === game.firstTurnPlayer
    return isFirstPlayerOpeningTurn ? t('turn.action.endTurn') : t('turn.action.toCombat')
  }
  if (game.turnPhase === 'end') return t('turn.action.endTurn')
  return ''
})

function advance() {
  if (!isMyTurn.value) return
  if (combat.isRolling) return
  gameActions.advancePhase()
}
</script>
