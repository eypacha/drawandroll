<template>
  <div class="absolute bottom-0 right-0 py-3 px-4 font-semibold w-42 text-right z-101">
    <span v-if="isMyTurn">Your Turn</span>
    <span v-else>Opponent Turn</span>
    <div class="text-xs font-normal opacity-80">
      {{ phaseLabel }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore, useConnectionStore } from '@/stores'

const game = useGameStore()
const connection = useConnectionStore()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const isMyTurn = computed(() => game.currentTurn === myPlayerId.value)
const phaseLabel = computed(() => {
  const map = {
    draw: 'Draw',
    recruit: 'Recruit',
    combat: 'Combat',
    end: 'End'
  }
  return map[game.turnPhase] || ''
})
</script>
