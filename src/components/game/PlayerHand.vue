<template>
  <div class="player-hand-container">
    <div class="player-hand">
      <div 
        v-for="(card, index) in myHand" 
        :key="card.id" 
        class="card-wrapper"
        :class="{ 
          'is-playable': canRecruit && card.type === 'hero',
          'is-selected': selectedCardId === card.id
        }"
        :style="getCardStyle(index)"
        @click="toggleSelect(card)"
      >
        <Card :card="card" class="hand-card" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore, useGameStore } from '@/stores'
import Card from './Card.vue'

const connection = useConnectionStore()
const players = usePlayersStore()
const game = useGameStore()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const myHand = computed(() => players.players[myPlayerId.value].hand)
const canRecruit = computed(() => game.turnPhase === 'recruit' && game.currentTurn === myPlayerId.value)
const selectedCardId = computed(() => players.players[myPlayerId.value].selectedCardId)

function toggleSelect(card) {
  if (!canRecruit.value) return
  if (card.type !== 'hero') return
  if (selectedCardId.value === card.id) {
    players.clearSelection(myPlayerId.value)
    return
  }
  players.selectCard(myPlayerId.value, card.id)
}

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
  cursor: default;
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

.card-wrapper.is-playable {
  cursor: pointer;
}

.card-wrapper.is-selected :deep(.hand-card) {
  box-shadow:
    0 0 0 3px rgba(245, 158, 11, 0.8),
    0 12px 25px -8px rgba(0, 0, 0, 0.35);
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
}
</style>
