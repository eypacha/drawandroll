<template>
  <div v-if="game.isPlaying" class="absolute bottom-0 right-0 py-3 px-4 font-semibold w-42 text-right z-101">
    <span v-if="isMyTurn">{{ t('turn.yourTurn') }}</span>
    <span v-else>{{ t('turn.opponentTurn') }}</span>
    <div class="text-xs font-normal opacity-80">
      {{ phaseLabel }}
    </div>
    <button
      v-if="isMyTurn && game.isPlaying && advanceLabel"
      class="mt-2 px-3 py-1 text-xs rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
      :disabled="isActionDisabled"
      :class="{ 'opacity-60 cursor-not-allowed': isActionDisabled }"
      @click="advance"
    >
      {{ advanceLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGameStore, useConnectionStore, useCombatStore, usePlayersStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'

const game = useGameStore()
const connection = useConnectionStore()
const combat = useCombatStore()
const players = usePlayersStore()
const gameActions = useGameActions()
const { t } = useI18n()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const isMyTurn = computed(() => game.currentTurn === myPlayerId.value)
const myHand = computed(() => players.players[myPlayerId.value].hand)
const selectedDiscardIds = computed(() => players.players[myPlayerId.value].discardSelectionIds || [])
const requiredDiscardCount = computed(() => Math.max(0, myHand.value.length - 7))
const phaseLabel = computed(() => {
  const map = {
    draw: t('turn.phase.draw'),
    recruit: t('turn.phase.recruit'),
    combat: t('turn.phase.combat'),
    discard: t('turn.phase.discard'),
    end: t('turn.phase.end')
  }
  return map[game.turnPhase] || ''
})

const advanceLabel = computed(() => {
  if (game.turnPhase === 'discard') return t('turn.action.discard')
  if (game.turnPhase === 'combat') return t('turn.action.endTurn')
  if (game.turnPhase === 'recruit') {
    const isFirstPlayerOpeningTurn =
      game.turn === 1 && game.currentTurn === game.firstTurnPlayer
    return isFirstPlayerOpeningTurn ? t('turn.action.endTurn') : t('turn.action.toCombat')
  }
  if (game.turnPhase === 'end') return t('turn.action.endTurn')
  return ''
})

const isActionDisabled = computed(() => {
  if (combat.isRolling) return true
  if (game.turnPhase !== 'discard') return false
  if (requiredDiscardCount.value <= 0) return false
  return selectedDiscardIds.value.length !== requiredDiscardCount.value
})

function advance() {
  if (!isMyTurn.value) return
  if (isActionDisabled.value) return
  if (game.turnPhase === 'discard') {
    gameActions.discardSelectedHand()
    return
  }
  gameActions.advancePhase()
}
</script>
