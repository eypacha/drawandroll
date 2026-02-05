<template>
  <div class="flex flex-1 flex-col items-center justify-center">
    <OpponentHand />
    <GameTable />
    <PlayerHand />
  </div>
</template>

<script setup>
import OpponentHand from './OpponentHand.vue'
import GameTable from './GameTable.vue'
import PlayerHand from './PlayerHand.vue'
</script>