<template>
  <div class="player-hand-container">
    <div
      v-if="showOpeningButtons"
      class="opening-mulligan-controls"
    >
      <button
        type="button"
        class="opening-btn opening-btn-secondary"
        :disabled="openingActionPending"
        @click="$emit('request-opening-mulligan')"
      >
        {{ t('openingMulligan.mulligan') }}
      </button>
      <button
        type="button"
        class="opening-btn opening-btn-primary"
        :disabled="openingActionPending"
        @click="$emit('accept-opening-hand')"
      >
        {{ t('openingMulligan.accept') }}
      </button>
    </div>

    <div class="player-hand">
      <div 
        v-for="(card, index) in myHand" 
        :key="card.id" 
        class="card-wrapper"
        :class="{ 
          'is-opening-layout': isOpeningLayout,
          'is-draw-locked': isDrawLocked,
          'is-draggable': canDragCard(card),
          'is-dragging': draggedCardId === card.id,
          'is-discard-selectable': canSelectForDiscard,
          'is-discard-selected': isSelectedForDiscard(card.id),
          'is-reactive-selectable': canSelectReactive(card),
          'is-healing-selected': pendingHealingCardId === card.id
        }"
        :style="getCardStyle(index)"
        :draggable="canDragCard(card)"
        @click="onCardClick(card)"
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
import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePlayersStore, useConnectionStore, useGameStore, useCombatStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'
import Card from './Card.vue'

const props = defineProps({
  openingFlow: {
    type: Object,
    required: true
  },
  myPlayerId: {
    type: Object,
    required: true
  },
  isDrawing: {
    type: Object,
    required: true
  },
  openingActionPending: {
    type: Boolean,
    default: false
  }
})

defineEmits(['accept-opening-hand', 'request-opening-mulligan'])

const connection = useConnectionStore()
const players = usePlayersStore()
const game = useGameStore()
const combat = useCombatStore()
const gameActions = useGameActions()
const { t } = useI18n()

const localPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const myPlayerId = computed(() => props.myPlayerId?.value || localPlayerId.value)
const myHand = computed(() => {
  const player = players.players[myPlayerId.value]
  const hiddenSet = new Set(player.hiddenHandCardIds || [])
  return player.hand.filter((card) => !hiddenSet.has(card.id))
})
const openingFlowActive = computed(() => Boolean(props.openingFlow?.active))
const isOpeningAcceptedByMe = computed(() => Boolean(props.openingFlow?.acceptedByPlayer?.[myPlayerId.value]))
const showOpeningButtons = computed(() => openingFlowActive.value && !isOpeningAcceptedByMe.value)
const isOpeningLayout = computed(() => openingFlowActive.value && !isOpeningAcceptedByMe.value)
const isDrawLocked = computed(() => Boolean(props.isDrawing?.value))
const canAct = computed(() => !openingFlowActive.value && game.turnPhase === 'recruit' && game.currentTurn === myPlayerId.value)
const canSelectForDiscard = computed(() => !openingFlowActive.value && game.turnPhase === 'discard' && game.currentTurn === myPlayerId.value)
const isReactionDefender = computed(() => combat.reactionWindow?.defenderPlayerId === myPlayerId.value)
const canReactNow = computed(() => combat.isReactionOpen && isReactionDefender.value)
const selectedDiscardIds = computed(() => players.players[myPlayerId.value].discardSelectionIds || [])
const draggedCardId = computed(() => players.players[myPlayerId.value].draggedCardId)
const myResources = computed(() => players.players[myPlayerId.value].resources)
const pendingHealingCardId = computed(() => players.players[myPlayerId.value].pendingHealingCardId)
let dragPreviewEl = null

function canDragCard(card) {
  if (canReactNow.value) return false
  if (!canAct.value) return false
  return card.type === 'hero' || card.type === 'item' || card.type === 'weapon'
}

function canSelectReactive(card) {
  if (openingFlowActive.value) return false
  if (!canReactNow.value) return false
  if (card?.type !== 'reactive' && card?.type !== 'counterattack' && card?.type !== 'healing') return false
  if (card?.type === 'healing' && players.getHealingTargets(myPlayerId.value).length === 0) return false
  return myResources.value >= Number(card.cost || 0)
}

function canArmHealingInRecruit(card) {
  if (openingFlowActive.value) return false
  if (!canAct.value) return false
  if (card?.type !== 'healing') return false
  if (myResources.value < Number(card.cost || 0)) return false
  return players.getHealingTargets(myPlayerId.value).length > 0
}

function isSelectedForDiscard(cardId) {
  return selectedDiscardIds.value.includes(cardId)
}

function getCardStyle(index) {
  const total = myHand.value.length
  if (total === 0) return {}
  
  const centerOffset = (index - (total - 1) / 2) / Math.max(total - 1, 1)
  const maxRotation = 8 // degrees
  const rotation = centerOffset * maxRotation * 2
  const maxVerticalOffset = 25 // pixels
  const verticalOffset = Math.pow(centerOffset * 2, 2) * maxVerticalOffset
  const zIndex = total - index
  
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
  if (canSelectForDiscard.value) return
  gameActions.setHoveredCard(card.id)
}

function onHoverEnd(card) {
  if (canSelectForDiscard.value) return
  if (draggedCardId.value === card.id) return
  gameActions.clearHoveredCard(card.id)
}

function onCardClick(card) {
  if (openingFlowActive.value) return
  if (canSelectReactive(card)) {
    if (card.type === 'healing') {
      if (pendingHealingCardId.value === card.id) {
        players.clearPendingHealingCard(myPlayerId.value)
      } else {
        players.setPendingHealingCard(myPlayerId.value, card.id)
      }
      return
    }
    players.clearPendingHealingCard(myPlayerId.value)
    gameActions.submitCombatReaction(card.id)
    return
  }
  if (canArmHealingInRecruit(card)) {
    if (pendingHealingCardId.value === card.id) {
      players.clearPendingHealingCard(myPlayerId.value)
    } else {
      players.setPendingHealingCard(myPlayerId.value, card.id)
    }
    return
  }
  if (!canSelectForDiscard.value) return
  players.clearPendingHealingCard(myPlayerId.value)
  players.toggleDiscardSelection(myPlayerId.value, card.id)
}

watch(
  () => [game.turnPhase, game.currentTurn],
  ([nextPhase, nextTurnPlayer]) => {
    if (nextPhase === 'discard' && nextTurnPlayer === myPlayerId.value) return
    players.clearDiscardSelection(myPlayerId.value)
    if (nextPhase !== 'recruit' && !(nextPhase === 'combat' && canReactNow.value)) {
      players.clearPendingHealingCard(myPlayerId.value)
    }
  }
)

watch(
  () => [combat.rollStep, combat.reactionWindow?.defenderPlayerId],
  ([nextStep, nextDefender]) => {
    if (nextStep === 'reaction_pending' && nextDefender === myPlayerId.value) return
    if (game.turnPhase === 'recruit' && game.currentTurn === myPlayerId.value) return
    players.clearPendingHealingCard(myPlayerId.value)
  }
)

onUnmounted(() => {
  removeDragPreview()
  players.clearDiscardSelection(myPlayerId.value)
  players.clearPendingHealingCard(myPlayerId.value)
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

.opening-mulligan-controls {
  position: fixed;
  bottom: 49.8%;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  pointer-events: auto;
  z-index: 130;
}

.opening-btn {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 18px;
  transition: background-color 0.2s ease;
}

.opening-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.opening-btn-secondary {
  border: 1px solid #d1d5db;
  background: #ffffff;
}

.opening-btn-secondary:hover:enabled {
  background: #f3f4f6;
}

.opening-btn-primary {
  border: 1px solid #111827;
  background: #111827;
  color: #ffffff;
}

.opening-btn-primary:hover:enabled {
  background: #374151;
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

.card-wrapper.is-opening-layout {
  transform: translateY(-50px) rotate(var(--rotation, 0deg)) !important;
}

.card-wrapper:hover {
  transform: 
    translateY(-0px) 
    rotate(0deg) 
    scale(1.08);
  z-index: var(--hover-z-index, 100);
}

/* .card-wrapper.is-opening-layout:hover {
  transform: translateY(-20px) rotate(var(--rotation, 0deg)) !important;
  z-index: var(--z-index, 1);
} */

.card-wrapper.is-draw-locked:hover {
  transform:
    translateY(calc(50% + var(--vertical-offset, 0px)))
    rotate(var(--rotation, 0deg))
    scale(1);
  z-index: var(--z-index, 1);
}

.card-wrapper.is-draggable {
  cursor: grab;
}

.card-wrapper.is-discard-selectable {
  cursor: pointer;
}

.card-wrapper.is-reactive-selectable {
  cursor: pointer;
}

.card-wrapper.is-discard-selected {
  transform:
    translateY(-6px)
    rotate(0deg)
    scale(1.03);
  z-index: var(--hover-z-index, 100);
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
    0 25px 50px -12px rgba(0, 0, 0, 0.4);
}

.card-wrapper.is-discard-selected :deep(.hand-card) {
  box-shadow:
    0 0 0 3px rgba(220, 38, 38, 0.45),
    0 18px 40px -12px rgba(220, 38, 38, 0.5);
}

.card-wrapper.is-reactive-selectable :deep(.hand-card) {
  box-shadow:
    0 0 0 3px rgba(37, 99, 235, 0.45),
    0 18px 40px -12px rgba(37, 99, 235, 0.45);
}

.card-wrapper.is-healing-selected :deep(.hand-card) {
  box-shadow:
    0 0 0 3px rgba(16, 185, 129, 0.6),
    0 18px 40px -12px rgba(16, 185, 129, 0.45);
}
</style>
