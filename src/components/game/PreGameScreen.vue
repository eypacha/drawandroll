<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-4 p-8 min-h-[400px] relative">
    <div class="text-center py-8">
      <p class="text-gray-500 text-lg font-light">{{ t('game.waitingOpponent') }}</p>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
