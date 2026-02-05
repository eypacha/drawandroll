<template>
  <div class="flex-1 flex flex-col items-center justify-center gap-6 p-6 min-h-[400px] relative">
    <div class="w-full max-w-5xl grid grid-rows-2 gap-8">
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
import { usePlayersStore, useConnectionStore } from '@/stores'
import Card from './Card.vue'

const players = usePlayersStore()
const connection = useConnectionStore()

const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')
const myHeroes = computed(() => players.players[myPlayerId.value].heroes)
const opponentHeroes = computed(() => players.players[opponentPlayerId.value].heroes)

const mySlots = computed(() => {
  return Array.from({ length: 3 }, (_, index) => ({
    key: `my-${index}`,
    card: myHeroes.value[index] || null
  }))
})

const opponentSlots = computed(() => {
  return Array.from({ length: 3 }, (_, index) => ({
    key: `opp-${index}`,
    card: opponentHeroes.value[index] || null
  }))
})
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
}

.slot-placeholder {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(0, 0, 0, 0.35);
}
</style>
