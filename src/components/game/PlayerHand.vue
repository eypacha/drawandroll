<template>
  <div class="p-4 bg-gray-50 border-t border-gray-100">
    <div class="flex justify-center gap-4 min-h-36">
      <Card v-for="card in myHand" :key="card.id" :card="card" />
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
</script>
