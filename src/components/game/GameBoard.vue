<template>
  <div class="relative h-screen overflow-hidden w-full flex flex-1 flex-col items-center justify-center">
    <OpponentHand />
    <div class="absolute left-8 top-1/2 -translate-y-1/2 z-[90]">
      <DeckPile />
    </div>
    <GameTable />
    <CombatOverlay />
    <PlayerHand />
    <TurnStatus />
    <ResourceDisplayPlayer />
    <ResourceDisplayOpponent />
  </div>
</template>

<script setup>
import OpponentHand from './OpponentHand.vue'
import DeckPile from './DeckPile.vue'
import GameTable from './GameTable.vue'
import CombatOverlay from './CombatOverlay.vue'
import PlayerHand from './PlayerHand.vue'
import TurnStatus from './TurnStatus.vue'
import ResourceDisplayPlayer from './ResourceDisplayPlayer.vue'
import ResourceDisplayOpponent from './ResourceDisplayOpponent.vue'
</script>
