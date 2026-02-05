<template>
  <div class="relative h-screen overflow-hidden w-full flex flex-1 flex-col items-center justify-center">
    <OpponentHand />
    <GameTable />
    <PlayerHand />
    <div class="absolute bottom-0 right-0 p-4">
       Your turn
    </div>
  </div>
</template>

<script setup>
import OpponentHand from './OpponentHand.vue'
import GameTable from './GameTable.vue'
import PlayerHand from './PlayerHand.vue'
</script>