<template>
  <div class="fixed top-0 left-0 right-0 h-[100px] flex justify-center items-start pointer-events-none z-[100]">
    <div class="flex justify-center items-start pointer-events-auto">
      <div 
        v-for="(card, index) in opponentHand" 
        :key="card.id" 
        class="card-wrapper transition-all duration-[250ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-top -ml-[55px] first:ml-0"
        :style="getCardStyle(index)"
      >
        <CardBack />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore } from '@/stores'
import CardBack from './CardBack.vue'

const connection = useConnectionStore()
const players = usePlayersStore()

const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')
const opponentHand = computed(() => players.players[opponentPlayerId.value].hand)

function getCardStyle(index) {
  const total = opponentHand.value.length
  if (total === 0) return {}
  
  const centerOffset = (index - (total - 1) / 2) / Math.max(total - 1, 1)
  const maxRotation = 6 // degrees (less rotation for opponent)
  const rotation = centerOffset * maxRotation * 2 * -1 // inverted rotation
  const maxVerticalOffset = 20 // pixels
  const verticalOffset = (1 - Math.pow(centerOffset * 2, 2)) * maxVerticalOffset
  const zIndex = index + 1
  
  return {
    '--rotation': `${rotation}deg`,
    '--vertical-offset': `${verticalOffset}px`,
    '--z-index': zIndex
  }
}
</script>

<style scoped>
.card-wrapper {
  transform: 
    translateY(calc(-50% + var(--vertical-offset, 0px))) 
    rotate(var(--rotation, 0deg));
  z-index: var(--z-index, 1);
}

.card-wrapper :deep(.card-back) {
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 10px 20px -5px rgba(0, 0, 0, 0.15);
}
</style>
