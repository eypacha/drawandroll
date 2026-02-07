<template>
  <div class="flex-1 -mt-10 flex flex-col items-center justify-center gap-6 p-6 min-h-[400px] relative">
    <div class="w-full max-w-5xl grid grid-rows-2 gap-22 [transform:perspective(2000px)_rotateX(45deg)]">
      <div class="grid grid-cols-3 gap-6 place-items-center">
        <div
          v-for="slot in opponentSlots"
          :key="slot.key"
          class="table-slot"
        >
          <div v-if="slot.hero" class="hero-stack">
            <div
              v-for="(item, index) in slot.hero.items"
              :key="item.id"
              class="item-under"
              :style="{ '--item-offset': `${-(index + 1) * 25}px`, '--item-z': `${9 - index}` }"
            >
              <Card :card="item" :hide-cost="true" />
            </div>
            <Card :card="getHeroDisplay(slot.hero)" :hide-cost="true" class="hero-card" />
          </div>
          <div v-else class="slot-placeholder">Empty</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-6 place-items-center">
        <div
          v-for="slot in mySlots"
          :key="slot.key"
          class="table-slot"
          :class="{
            'slot-hoverable': canPlaceHero && !slot.hero,
            'slot-hoverable-hero': canEquipItem && slot.hero
          }"
          :style="{ '--slot-highlight': slotHighlightColor, '--slot-highlight-soft': slotHighlightSoft }"
          @click="tryPlace(slot.index)"
        >
          <div v-if="slot.hero" class="hero-stack">
            <div
              v-for="(item, index) in slot.hero.items"
              :key="item.id"
              class="item-under"
              :style="{ '--item-offset': `${-(index + 1) * 25}px`, '--item-z': `${9 - index}` }"
            >
              <Card :card="item" :hide-cost="true" />
            </div>
            <Card :card="getHeroDisplay(slot.hero)" :hide-cost="true" class="hero-card" />
          </div>
          <div v-else class="slot-placeholder">Empty</div>
        </div>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore, useGameStore } from '@/stores'
import { useGameActions } from '@/composables/useGameActions'
import Card from './Card.vue'

const players = usePlayersStore()
const connection = useConnectionStore()
const game = useGameStore()
const gameActions = useGameActions()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')
const myHeroes = computed(() => players.players[myPlayerId.value].heroes)
const opponentHeroes = computed(() => players.players[opponentPlayerId.value].heroes)
const myHand = computed(() => players.players[myPlayerId.value].hand)
const selectedCardId = computed(() => players.players[myPlayerId.value].selectedCardId)
const canRecruit = computed(() => game.turnPhase === 'recruit' && game.currentTurn === myPlayerId.value)

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

const selectedCard = computed(() => {
  if (!selectedCardId.value) return null
  return myHand.value.find((card) => card.id === selectedCardId.value) || null
})

const canAffordSelected = computed(() => {
  if (!selectedCard.value) return false
  const cost = selectedCard.value.type === 'hero'
    ? players.getRecruitCost(myPlayerId.value, selectedCard.value.cost)
    : selectedCard.value.cost
  return players.players[myPlayerId.value].resources >= cost
})

const canPlaceHero = computed(() => canRecruit.value && selectedCard.value?.type === 'hero' && canAffordSelected.value)
const canEquipItem = computed(() => canRecruit.value && selectedCard.value?.type === 'item' && canAffordSelected.value)

const slotHighlightColor = computed(() => {
  const map = {
    hero: 'rgba(245, 158, 11, 0.9)',
    item: 'rgba(139, 92, 246, 0.9)',
    healing: 'rgba(16, 185, 129, 0.9)',
    reactive: 'rgba(59, 130, 246, 0.9)'
  }
  return map[selectedCard.value?.type] || 'rgba(245, 158, 11, 0.9)'
})

const slotHighlightSoft = computed(() => {
  const map = {
    hero: 'rgba(245, 158, 11, 0.35)',
    item: 'rgba(139, 92, 246, 0.35)',
    healing: 'rgba(16, 185, 129, 0.35)',
    reactive: 'rgba(59, 130, 246, 0.35)'
  }
  return map[selectedCard.value?.type] || 'rgba(245, 158, 11, 0.35)'
})

function tryPlace(slotIndex) {
  if (canEquipItem.value) {
    const played = gameActions.playItemToSlot(slotIndex, selectedCardId.value)
    if (!played) return
    return
  }
  if (canPlaceHero.value) {
    gameActions.playHeroToSlot(slotIndex, selectedCardId.value)
  }
}

function getHeroDisplay(hero) {
  const base = hero.card.stats || { atk: 0, def: 0, hp: 0 }
  const delta = { atk: 0, def: 0, hp: 0 }
  for (const item of hero.items || []) {
    const stats = item.stats || {}
    if (typeof stats.atkBonus === 'number') delta.atk += stats.atkBonus
    if (typeof stats.atkModifier === 'number') delta.atk += stats.atkModifier
    if (typeof stats.defBonus === 'number') delta.def += stats.defBonus
    if (typeof stats.defModifier === 'number') delta.def += stats.defModifier
    if (typeof stats.hpBonus === 'number') delta.hp += stats.hpBonus
    if (typeof stats.hpModifier === 'number') delta.hp += stats.hpModifier
  }
  return {
    ...hero.card,
    baseStats: base,
    statDelta: delta,
    stats: {
      atk: base.atk + delta.atk,
      def: base.def + delta.def,
      hp: base.hp + delta.hp
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

.table-slot.slot-hoverable:hover {
  border-color: var(--slot-highlight, rgba(245, 158, 11, 0.9));
  box-shadow: 0 0 0 3px var(--slot-highlight-soft, rgba(245, 158, 11, 0.35));
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
}

.table-slot.slot-hoverable-hero:hover {
  border-color: var(--slot-highlight, rgba(245, 158, 11, 0.9));
  box-shadow: 0 0 0 3px var(--slot-highlight-soft, rgba(245, 158, 11, 0.35));
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
}

.hero-stack {
  position: relative;
  width: 176px;
  height: 264px;
}

.hero-card {
  position: relative;
  z-index: 10;
}

.item-under {
  position: absolute;
  inset: 0;
  transform: translateY(var(--item-offset, 16px));
  z-index: var(--item-z, 1);
  pointer-events: none;
}

.slot-placeholder {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(0, 0, 0, 0.35);
}
</style>
