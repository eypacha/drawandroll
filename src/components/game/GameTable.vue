<template>
  <div class="flex-1 -mt-10 flex flex-col items-center justify-center gap-6 p-6 min-h-[400px] relative">
    <div class="w-full max-w-5xl grid grid-rows-2 gap-22 [transform:perspective(2000px)_rotateX(45deg)]">
      <div class="grid grid-cols-3 gap-6 place-items-center">
        <div
          v-for="slot in opponentSlots"
          :key="slot.key"
          class="table-slot"
          :class="{
            'slot-occupied': Boolean(slot.hero),
            'slot-attack-target': isAttackTarget(slot.index)
          }"
          @dragover="onOpponentSlotDragOver(slot.index, $event)"
          @dragleave="onOpponentSlotDragLeave(slot.index)"
          @drop="onOpponentSlotDrop(slot.index, $event)"
        >
          <div v-if="slot.hero" class="hero-stack">
            <div
              v-for="(item, index) in slot.hero.items"
              :key="item.id"
              class="item-under"
              :class="{ 'item-under-exhausted': slot.hero?.hasAttackedThisPhase || slot.hero?.summoningSick }"
              :style="{ '--item-offset': `${-(index + 1) * 25}px`, '--item-z': `${9 - index}` }"
            >
              <Card :card="item" :hide-cost="true" />
            </div>
            <Card
              :card="getHeroDisplay(slot.hero)"
              :hide-cost="true"
              class="hero-card"
              :class="{ 'hero-card-exhausted-opponent': slot.hero?.hasAttackedThisPhase || slot.hero?.summoningSick }"
            />
          </div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-6 place-items-center">
        <div
          v-for="slot in mySlots"
          :key="slot.key"
          class="table-slot"
          :class="{
            'slot-occupied': Boolean(slot.hero),
            'slot-drop-valid': isActiveDropSlot(slot.index),
            'slot-attack-selectable': canSelectAttacker(slot.index)
          }"
          :style="getSlotStyle(slot.index)"
          @click="onMySlotClick(slot.index)"
          @dragover="onSlotDragOver(slot.index, $event)"
          @dragleave="onSlotDragLeave(slot.index)"
          @drop="onSlotDrop(slot.index, $event)"
        >
          <div v-if="slot.hero" class="hero-stack">
            <div
              v-for="(item, index) in slot.hero.items"
              :key="item.id"
              class="item-under"
              :class="{ 'item-under-exhausted': slot.hero?.hasAttackedThisPhase || slot.hero?.summoningSick }"
              :style="{ '--item-offset': `${-(index + 1) * 25}px`, '--item-z': `${9 - index}` }"
            >
              <Card :card="item" :hide-cost="true" />
            </div>
            <Card
              :card="getHeroDisplay(slot.hero)"
              :hide-cost="true"
              class="hero-card"
              :class="{ 'hero-card-exhausted-player': slot.hero?.hasAttackedThisPhase || slot.hero?.summoningSick }"
              :draggable="canSelectAttacker(slot.index)"
              @dragstart="onHeroAttackDragStart(slot.index, $event)"
              @dragend="onHeroAttackDragEnd"
            />
          </div>
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { usePlayersStore, useConnectionStore, useGameStore, useCombatStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'
import Card from './Card.vue'

const players = usePlayersStore()
const connection = useConnectionStore()
const game = useGameStore()
const combat = useCombatStore()
const gameActions = useGameActions()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')
const myHeroes = computed(() => players.players[myPlayerId.value].heroes)
const opponentHeroes = computed(() => players.players[opponentPlayerId.value].heroes)
const myHand = computed(() => players.players[myPlayerId.value].hand)
const canRecruit = computed(() => game.turnPhase === 'recruit' && game.currentTurn === myPlayerId.value)
const canCombat = computed(() => game.turnPhase === 'combat' && game.currentTurn === myPlayerId.value)
const canReactionHeal = computed(() => (
  combat.rollStep === 'reaction_pending' &&
  combat.reactionWindow?.defenderPlayerId === myPlayerId.value
))
const draggedCardId = computed(() => players.players[myPlayerId.value].draggedCardId)
const pendingHealingCardId = computed(() => players.players[myPlayerId.value].pendingHealingCardId)
const activeDropSlot = ref(null)
const draggedAttackerSlot = ref(null)
const activeAttackTargetSlot = ref(null)

watch(
  () => draggedCardId.value,
  (nextDraggedCardId) => {
    if (!nextDraggedCardId) {
      activeDropSlot.value = null
    }
  }
)

watch(
  () => [canCombat.value, combat.isRolling],
  ([nextCanCombat, nextIsRolling]) => {
    if (!nextCanCombat || nextIsRolling) {
      draggedAttackerSlot.value = null
      activeAttackTargetSlot.value = null
    }
  }
)

const mySlots = computed(() => {
  return Array.from({ length: 3 }, (_, index) => ({
    key: `my-${index}`,
    index,
    hero: myHeroes.value[index] || null
  }))
})

const opponentSlots = computed(() => {
  return Array.from({ length: 3 }, (_, index) => ({
    key: `opp-${index}`,
    index,
    hero: opponentHeroes.value[index] || null
  }))
})

function getCardFromHand(cardId) {
  if (!cardId) return null
  return myHand.value.find((card) => card.id === cardId) || null
}

function getPendingHealingCard() {
  if (!pendingHealingCardId.value) return null
  const card = getCardFromHand(pendingHealingCardId.value)
  if (!card || card.type !== 'healing') return null
  return card
}

function canApplyHealingOnSlot(slotIndex) {
  const card = getPendingHealingCard()
  if (!card) return false
  const canUseInRecruit = canRecruit.value
  const canUseInReaction = canReactionHeal.value
  if (!canUseInRecruit && !canUseInReaction) return false
  const resources = Number(players.players[myPlayerId.value].resources || 0)
  if (resources < Number(card.cost || 0)) return false
  return players.getHealingTargets(myPlayerId.value).includes(slotIndex)
}

function getDraggedCardId(event) {
  const customId = event.dataTransfer?.getData('application/x-card-id')
  if (customId) return customId
  const plain = event.dataTransfer?.getData('text/plain')
  if (plain) return plain
  return draggedCardId.value || null
}

function canDropOnSlot(slotIndex, cardId) {
  if (!canRecruit.value) return false
  const card = getCardFromHand(cardId)
  if (!card) return false

  const slotHero = myHeroes.value[slotIndex]
  const playerResources = players.players[myPlayerId.value].resources

  if (card.type === 'hero') {
    if (slotHero) return false
    const cost = players.getRecruitCost(myPlayerId.value, card.cost)
    return playerResources >= cost
  }

  if (card.type === 'item' || card.type === 'weapon') {
    if (!slotHero) return false
    if ((slotHero.items || []).length >= 3) return false
    return playerResources >= card.cost
  }

  return false
}

function getSlotStyle(slotIndex) {
  if (canApplyHealingOnSlot(slotIndex)) {
    return {
      '--slot-highlight': 'rgba(16, 185, 129, 0.9)',
      '--slot-highlight-soft': 'rgba(16, 185, 129, 0.35)'
    }
  }
  const card = getCardFromHand(draggedCardId.value)
  if (!card || !canDropOnSlot(slotIndex, draggedCardId.value)) {
    return {}
  }
  const map = {
    hero: {
      '--slot-highlight': 'rgba(245, 158, 11, 0.9)',
      '--slot-highlight-soft': 'rgba(245, 158, 11, 0.35)'
    },
    item: {
      '--slot-highlight': 'rgba(139, 92, 246, 0.9)',
      '--slot-highlight-soft': 'rgba(139, 92, 246, 0.35)'
    },
    weapon: {
      '--slot-highlight': 'rgba(234, 88, 12, 0.9)',
      '--slot-highlight-soft': 'rgba(234, 88, 12, 0.35)'
    }
  }
  return map[card.type] || {}
}

function isDropCandidate(slotIndex) {
  return canDropOnSlot(slotIndex, draggedCardId.value)
}

function isActiveDropSlot(slotIndex) {
  if (canApplyHealingOnSlot(slotIndex)) return true
  return activeDropSlot.value === slotIndex && isDropCandidate(slotIndex)
}

function onSlotDragOver(slotIndex, event) {
  const cardId = getDraggedCardId(event)
  if (!cardId || !canDropOnSlot(slotIndex, cardId)) {
    if (activeDropSlot.value === slotIndex) {
      activeDropSlot.value = null
    }
    return
  }

  event.preventDefault()
  activeDropSlot.value = slotIndex
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onSlotDragLeave(slotIndex) {
  if (activeDropSlot.value === slotIndex) {
    activeDropSlot.value = null
  }
}

function onSlotDrop(slotIndex, event) {
  event.preventDefault()
  activeDropSlot.value = null

  const cardId = getDraggedCardId(event)
  if (!cardId || !canDropOnSlot(slotIndex, cardId)) {
    players.clearDraggedCard(myPlayerId.value)
    return
  }

  const card = getCardFromHand(cardId)
  if (!card) {
    players.clearDraggedCard(myPlayerId.value)
    return
  }

  if (card.type === 'hero') {
    gameActions.playHeroToSlot(slotIndex, cardId)
  }
  if (card.type === 'item' || card.type === 'weapon') {
    gameActions.playItemToSlot(slotIndex, cardId)
  }

  players.clearDraggedCard(myPlayerId.value)
}

function canSelectAttacker(slotIndex) {
  if (!canCombat.value) return false
  if (combat.isRolling) return false
  return players.canHeroAttack(myPlayerId.value, slotIndex)
}

function isAttackTarget(slotIndex) {
  return activeAttackTargetSlot.value === slotIndex
}

function onMySlotClick(slotIndex) {
  if (canApplyHealingOnSlot(slotIndex)) {
    const cardId = pendingHealingCardId.value
    if (!cardId) return
    let played = null
    if (canReactionHeal.value) {
      played = gameActions.submitCombatReaction(cardId, slotIndex)
    } else if (canRecruit.value) {
      played = gameActions.playHealingToSlot(slotIndex, cardId)
    }
    if (played) {
      players.clearPendingHealingCard(myPlayerId.value)
    }
    return
  }
}

function getDraggedAttackSlot(event) {
  const value = event.dataTransfer?.getData('application/x-attack-slot')
  if (!value && value !== '0') return draggedAttackerSlot.value
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) return null
  if (parsed < 0 || parsed > 2) return null
  return parsed
}

function canAttackTarget(slotIndex, attackerSlot = draggedAttackerSlot.value) {
  if (!canCombat.value) return false
  if (combat.isRolling) return false
  if (!Number.isInteger(attackerSlot)) return false
  if (!canSelectAttacker(attackerSlot)) return false
  return Boolean(opponentHeroes.value[slotIndex])
}

function onHeroAttackDragStart(slotIndex, event) {
  if (!canSelectAttacker(slotIndex)) {
    event.preventDefault()
    return
  }
  draggedAttackerSlot.value = slotIndex
  activeAttackTargetSlot.value = null
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-attack-slot', String(slotIndex))
  }
}

function onHeroAttackDragEnd() {
  draggedAttackerSlot.value = null
  activeAttackTargetSlot.value = null
}

function onOpponentSlotDragOver(slotIndex, event) {
  const attackerSlot = getDraggedAttackSlot(event)
  if (!canAttackTarget(slotIndex, attackerSlot)) {
    if (activeAttackTargetSlot.value === slotIndex) {
      activeAttackTargetSlot.value = null
    }
    return
  }

  event.preventDefault()
  activeAttackTargetSlot.value = slotIndex
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function onOpponentSlotDragLeave(slotIndex) {
  if (activeAttackTargetSlot.value === slotIndex) {
    activeAttackTargetSlot.value = null
  }
}

async function onOpponentSlotDrop(slotIndex, event) {
  event.preventDefault()
  const attackerSlot = getDraggedAttackSlot(event)
  activeAttackTargetSlot.value = null
  draggedAttackerSlot.value = null
  if (!canAttackTarget(slotIndex, attackerSlot)) return
  await gameActions.attackHero(attackerSlot, slotIndex)
}

function getHeroDisplay(hero) {
  const base = hero.card.stats || { atk: 0, dex: 0, def: 0, hp: 0 }
  const current = players.getHeroCombatStats(hero)
  return {
    ...hero.card,
    baseStats: base,
    statDelta: {
      atk: current.atk - (base.atk || 0),
      dex: current.dex - (base.dex || 0),
      def: current.def - (base.def || 0),
      hp: current.hp - (base.hp || 0)
    },
    stats: {
      atk: current.atk,
      dex: current.dex,
      def: current.def,
      hp: current.hp
    }
  }
}
</script>

<style scoped>
.table-slot {
  width: 176px;
  height: 264px;
  border-radius: 0.75rem;
  border: 2px dashed rgba(0, 0, 0, 0.15);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
  cursor: default;
}

.table-slot.slot-drop-valid {
  border-color: var(--slot-highlight, rgba(245, 158, 11, 0.9));
  box-shadow: 0 0 0 3px var(--slot-highlight-soft, rgba(245, 158, 11, 0.35));
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
}

.table-slot.slot-attack-selectable {
  border-color: rgba(37, 99, 235, 0.9);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
  cursor: pointer;
}

.table-slot.slot-attack-target {
  border-color: rgba(220, 38, 38, 0.92);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
  cursor: crosshair;
}

.table-slot.slot-occupied {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
}

.hero-stack {
  position: relative;
  width: 176px;
  height: 264px;
}

.hero-card {
  position: relative;
  z-index: 10;
  transition: transform 0.25s ease;
}

.hero-card.hero-card-exhausted-player {
  transform: rotate(15deg);
}

.hero-card.hero-card-exhausted-opponent {
  transform: rotate(15deg);
}

.item-under {
  position: absolute;
  inset: 0;
  transform: translateY(var(--item-offset, 16px));
  z-index: var(--item-z, 1);
  pointer-events: none;
  transition: transform 0.25s ease;
}

.item-under.item-under-exhausted {
  transform: translateY(var(--item-offset, 16px)) rotate(15deg);
}
</style>
