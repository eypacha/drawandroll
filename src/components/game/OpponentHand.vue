<template>
  <div class="p-4 bg-gray-50 border-b border-gray-100">
    <div class="flex justify-center gap-2 min-h-24">
      <CardBack 
        v-for="(card, index) in opponentHand" 
        :key="card.id" 
      />
    </div>
    <p class="text-center text-xs uppercase tracking-widest text-gray-400 mt-2">
      Opponent ({{ opponentHand.length }} cards)
    </p>
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
</script>
