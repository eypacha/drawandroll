<template>
  <div
    v-if="reactionReveal?.card"
    class="pointer-events-none absolute inset-0 z-[230] flex items-center justify-center"
  >
    <div class="reaction-reveal-frame">
      <Card :card="reactionReveal.card" class="reaction-reveal-card" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useCombatStore } from '@/stores'
import Card from './Card.vue'

const combat = useCombatStore()
const reactionReveal = computed(() => combat.reactionReveal)
</script>

<style scoped>
.reaction-reveal-frame {
  transform: none;
}

.reaction-reveal-card {
  transform: none !important;
}
</style>
