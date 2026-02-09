<template>
  <div class="relative w-[110px] h-[165px] pointer-events-none" aria-label="Shared deck">
    <div class="absolute inset-0 -translate-x-[8px] translate-y-[6px] opacity-90">
      <CardBack />
    </div>
    <div class="absolute inset-0 -translate-x-[4px] translate-y-[3px] opacity-95">
      <CardBack />
    </div>
    <div class="absolute inset-0">
      <CardBack />
    </div>
    <div class="absolute -right-[10px] -bottom-[12px] z-20 min-w-[34px] h-[34px] rounded-full border-2 border-gray-200 bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
      {{ deck.cardsRemaining }}
    </div>
  </div>
</template>

<script setup>
import { useDeckStore } from '@/stores'
import CardBack from './CardBack.vue'

const deck = useDeckStore()
</script>
