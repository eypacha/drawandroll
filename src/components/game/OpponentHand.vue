<template>
  <div class="opponent-hand-container">
    <div class="opponent-hand">
      <div 
        v-for="(card, index) in opponentHand" 
        :key="card.id" 
        class="card-wrapper"
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
.opponent-hand-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: none;
  z-index: 100;
}

.opponent-hand {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  pointer-events: auto;
}

.card-wrapper {
  margin-left: -55px;
  transform: 
    translateY(calc(-50% + var(--vertical-offset, 0px))) 
    rotate(var(--rotation, 0deg));
  transform-origin: top center;
  z-index: var(--z-index, 1);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card-wrapper:first-child {
  margin-left: 0;
}

.card-wrapper :deep(.card-back) {
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 10px 20px -5px rgba(0, 0, 0, 0.15);
}
</style>
