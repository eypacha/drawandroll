<template>
  <div class="flex-1 -mt-10 flex flex-col items-center justify-center gap-6 p-6 min-h-[400px] relative">
    <div class="w-full max-w-5xl grid grid-rows-2 gap-8 [transform:perspective(2000px)_rotateX(45deg)]">
      <div class="grid grid-cols-3 gap-6 place-items-center">
        <div
          v-for="slot in opponentSlots"
          :key="slot.key"
          class="table-slot"
        >
          <Card v-if="slot.card" :card="slot.card" />
          <div v-else class="slot-placeholder">Empty</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-6 place-items-center">
        <div
          v-for="slot in mySlots"
          :key="slot.key"
          class="table-slot"
          :class="{
            'slot-hoverable': canPlaceSelected && !slot.card
          }"
          @click="tryPlace(slot.index)"
        >
          <Card v-if="slot.card" :card="slot.card" />
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
import { sendMessage } from '@/services/peerService'
import Card from './Card.vue'

const players = usePlayersStore()
const connection = useConnectionStore()
const game = useGameStore()

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
    card: myHeroes.value[index] || null
  }))
})

const opponentSlots = computed(() => {
  return Array.from({ length: 3 }, (_, index) => ({
    key: `opp-${index}`,
    index,
    card: opponentHeroes.value[index] || null
  }))
})

const selectedCard = computed(() => {
  if (!selectedCardId.value) return null
  return myHand.value.find((card) => card.id === selectedCardId.value) || null
})

const canAffordSelected = computed(() => {
  if (!selectedCard.value) return false
  const cost = players.getRecruitCost(myPlayerId.value, selectedCard.value.cost)
  return players.players[myPlayerId.value].resources >= cost
})

const canPlaceSelected = computed(() => canRecruit.value && !!selectedCard.value && canAffordSelected.value)

function tryPlace(slotIndex) {
  if (!canPlaceSelected.value) return
  const played = players.playHeroFromHand(myPlayerId.value, selectedCardId.value, slotIndex)
  if (!played) return
  players.clearSelection(myPlayerId.value)
  sendMessage({
    type: 'recruit_hero',
    payload: {
      playerId: myPlayerId.value,
      card: played.card,
      cost: played.cost,
      slotIndex: played.slotIndex
    }
  })
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
  border-color: rgba(245, 158, 11, 0.9);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.35);
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
}

.slot-placeholder {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(0, 0, 0, 0.35);
}
</style>
