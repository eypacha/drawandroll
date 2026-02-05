

<template>
    <div class="absolute left-4 top-5 flex flex-col items-center space-y-2">
        <span
          v-for="n in opponentMaxResources"
          :key="n"
          class="text-2xl leading-none transition-opacity duration-150"
          :class="{ 'opacity-20': n > opponentResources }"
        >
          🪙
        </span>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore } from '@/stores'

const players = usePlayersStore()
const connection = useConnectionStore()
const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')
const opponentResources = computed(() => players.players[opponentPlayerId.value].resources)
const opponentMaxResources = computed(() => players.players[opponentPlayerId.value].maxResources)
</script>
