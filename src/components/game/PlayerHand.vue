<template>
  <div class="player-hand-container">
    <div class="player-hand">
      <div 
        v-for="(card, index) in myHand" 
        :key="card.id" 
        class="card-wrapper"
        :class="{ 
          'is-draggable': canDragCard(card),
          'is-dragging': draggedCardId === card.id
        }"
        :style="getCardStyle(index)"
        :draggable="canDragCard(card)"
        @dragstart="onDragStart($event, card)"
        @dragend="onDragEnd(card)"
        @mouseenter="onHover(card)"
        @mouseleave="onHoverEnd(card)"
      >
        <Card :card="card" class="hand-card" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted } from 'vue'
import { usePlayersStore, useConnectionStore, useGameStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'
import Card from './Card.vue'

const connection = useConnectionStore()
const players = usePlayersStore()
const game = useGameStore()
const gameActions = useGameActions()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const myHand = computed(() => players.players[myPlayerId.value].hand)
const canAct = computed(() => game.turnPhase === 'recruit' && game.currentTurn === myPlayerId.value)
const draggedCardId = computed(() => players.players[myPlayerId.value].draggedCardId)
let dragPreviewEl = null

function canDragCard(card) {
  if (!canAct.value) return false
  return card.type === 'hero' || card.type === 'item'
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

function onDragStart(event, card) {
  if (!canDragCard(card)) {
    event.preventDefault()
    return
  }

  removeDragPreview()
  players.setDraggedCard(myPlayerId.value, card.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-card-id', card.id)
    event.dataTransfer.setData('text/plain', card.id)

    const sourceCardEl = event.currentTarget?.querySelector?.('.hand-card')
    if (sourceCardEl instanceof HTMLElement) {
      const rect = sourceCardEl.getBoundingClientRect()
      const sourceStyles = window.getComputedStyle(sourceCardEl)
      const wrapper = document.createElement('div')
      wrapper.style.position = 'fixed'
      wrapper.style.left = '-10000px'
      wrapper.style.top = '-10000px'
      wrapper.style.width = `${rect.width}px`
      wrapper.style.height = `${rect.height}px`
      wrapper.style.pointerEvents = 'none'
      wrapper.style.borderRadius = sourceStyles.borderRadius || '0px'
      wrapper.style.overflow = 'hidden'
      wrapper.style.zIndex = '9999'
      wrapper.style.margin = '0'
      wrapper.style.padding = '0'

      const clonedCard = sourceCardEl.cloneNode(true)
      if (clonedCard instanceof HTMLElement) {
        clonedCard.style.width = `${rect.width}px`
        clonedCard.style.height = `${rect.height}px`
        clonedCard.style.transform = 'none'
        clonedCard.style.transition = 'none'
        clonedCard.style.margin = '0'
        clonedCard.style.borderRadius = sourceStyles.borderRadius || '0px'
        clonedCard.style.overflow = 'hidden'
        wrapper.appendChild(clonedCard)
        document.body.appendChild(wrapper)
        dragPreviewEl = wrapper

        const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left))
        const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top))
        event.dataTransfer.setDragImage(wrapper, offsetX, offsetY)
      }
    }
  }
  gameActions.setHoveredCard(card.id)
}

function onDragEnd(card) {
  players.clearDraggedCard(myPlayerId.value)
  gameActions.clearHoveredCard(card.id)
  removeDragPreview()
}

function removeDragPreview() {
  if (!dragPreviewEl) return
  dragPreviewEl.remove()
  dragPreviewEl = null
}

function onHover(card) {
  gameActions.setHoveredCard(card.id)
}

function onHoverEnd(card) {
  if (draggedCardId.value === card.id) return
  gameActions.clearHoveredCard(card.id)
}

onUnmounted(() => {
  removeDragPreview()
})
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

.card-wrapper.is-draggable {
  cursor: grab;
}

.card-wrapper.is-dragging {
  opacity: 0;
}

.card-wrapper,
.card-wrapper * {
  -webkit-user-select: none;
  user-select: none;
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
