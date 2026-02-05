

<template>
    <div class="absolute left-4 bottom-6 flex flex-col items-center space-y-2">
        <span v-for="n in myResources" :key="n" class="text-2xl leading-none">🪙</span>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore } from '@/stores'

const players = usePlayersStore()
const connection = useConnectionStore()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const myResources = computed(() => players.players[myPlayerId.value].resources)
</script>
