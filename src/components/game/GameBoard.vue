<template>
  <div class="relative h-screen overflow-hidden w-full flex flex-1 flex-col items-center justify-center">
    <OpponentHand />
    <GameTable />
    <PlayerHand />
    <TurnStatus />
    <ResourceDisplayPlayer />
    <ResourceDisplayOpponent />
  </div>
</template>

<script setup>
import OpponentHand from './OpponentHand.vue'
import GameTable from './GameTable.vue'
import PlayerHand from './PlayerHand.vue'
import TurnStatus from './TurnStatus.vue'
import ResourceDisplayPlayer from './ResourceDisplayPlayer.vue'
import ResourceDisplayOpponent from './ResourceDisplayOpponent.vue'
</script>