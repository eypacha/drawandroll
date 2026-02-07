<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 p-8 min-h-[400px] relative">
    <div class="text-center" v-if="isHost">
      <button 
        @click="$emit('start-game')"
        class="px-6 py-3 bg-gray-900 text-white text-sm tracking-wide hover:bg-gray-700 transition-colors"
      >
        {{ t('game.startGame') }}
      </button>
    </div>
    <div v-else class="text-center text-gray-700 text-sm tracking-wide">
      {{ t('game.waitingHostStart') }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useConnectionStore } from '@/stores'

const connection = useConnectionStore()
const isHost = computed(() => connection.isHost)
const { t } = useI18n()

defineEmits(['start-game'])
</script>
