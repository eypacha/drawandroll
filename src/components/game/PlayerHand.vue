<template>
  <div class="player-hand-container">
    <div class="player-hand">
      <div 
        v-for="(card, index) in myHand" 
        :key="card.id" 
        class="card-wrapper"
        :style="getCardStyle(index)"
      >
        <Card :card="card" class="hand-card" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore } from '@/stores'
import Card from './Card.vue'

const connection = useConnectionStore()
const players = usePlayersStore()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const myHand = computed(() => players.players[myPlayerId.value].hand)

function getCardStyle(index) {
  const total = myHand.value.length
  if (total === 0) return {}
  
  const centerOffset = (index - (total - 1) / 2) / Math.max(total - 1, 1)
  const maxRotation = 8 // degrees
  const rotation = centerOffset * maxRotation * 2
  const maxVerticalOffset = 25 // pixels
  const verticalOffset = Math.pow(centerOffset * 2, 2) * maxVerticalOffset
  const zIndex = index + 1
  
  return {
    '--rotation': `${rotation}deg`,
    '--vertical-offset': `${verticalOffset}px`,
    '--z-index': zIndex,
    '--hover-z-index': total + 10
  }
}
</script>

<style scoped>
.player-hand-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 140px;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: none;
  z-index: 100;
}

.player-hand {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 0;
  pointer-events: auto;
}

.card-wrapper {
  margin-left: -50px;
  transform: 
    translateY(calc(50% + var(--vertical-offset, 0px))) 
    rotate(var(--rotation, 0deg));
  transform-origin: bottom center;
  z-index: var(--z-index, 1);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
}

.card-wrapper:first-child {
  margin-left: 0;
}

.card-wrapper:hover {
  transform: 
    translateY(-0px) 
    rotate(0deg) 
    scale(1.08);
  z-index: var(--hover-z-index, 100);
}

.card-wrapper :deep(.hand-card) {
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 10px 30px -5px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.25s ease;
}

.card-wrapper:hover :deep(.hand-card) {
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    0 0 0 2px rgba(255, 215, 0, 0.5);
}
</style>
