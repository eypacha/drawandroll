

<template>
    <div class="absolute left-4 top-5 flex flex-col items-center space-y-2">
        <span v-for="n in opponentResources" :key="n" class="text-2xl leading-none">🪙</span>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore } from '@/stores'

const players = usePlayersStore()
const connection = useConnectionStore()
const opponentPlayerId = computed(() => connection.isHost ? 'player_b' : 'player_a')
const opponentResources = computed(() => players.players[opponentPlayerId.value].resources)
</script>
