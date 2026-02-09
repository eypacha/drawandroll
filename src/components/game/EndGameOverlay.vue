<template>
  <div class="absolute inset-0 z-[230] bg-black/55 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl p-6 text-center">
      <h2 class="text-xl font-bold">
        {{ didWin ? t('endgame.titleWin') : t('endgame.titleLose') }}
      </h2>
      <p class="mt-2 text-sm text-gray-700">
        {{ t('endgame.subtitle') }}
      </p>

      <button
        type="button"
        class="mt-5 px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        :disabled="restartPending"
        @click="$emit('restart-game')"
      >
        {{ t('endgame.restart') }}
      </button>

      <p v-if="restartPending" class="mt-3 text-xs text-gray-600">
        {{ t('pause.restartPending') }}
      </p>
      <p v-else-if="restartStatus === 'declined'" class="mt-3 text-xs text-gray-600">
        {{ t('pause.restartDeclined') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore, useGameStore } from '@/stores'

defineEmits(['restart-game'])

defineProps({
  restartPending: {
    type: Boolean,
    default: false
  },
  restartStatus: {
    type: String,
    default: 'idle'
  }
})

const { t } = useI18n()
const connection = useConnectionStore()
const game = useGameStore()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const didWin = computed(() => game.winner === myPlayerId.value)
</script>
