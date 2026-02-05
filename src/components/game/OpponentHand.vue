<template>
  <div class="p-4">
    <div class="flex justify-center gap-2">
      <CardBack 
        v-for="(card, index) in opponentHand" 
        :key="card.id" 
      />
    </div>
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
