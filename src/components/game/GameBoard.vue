<template>
  <div class="relative h-screen overflow-hidden w-full flex flex-1 flex-col items-center justify-center">
    <OpponentHand />
    <div class="absolute left-8 top-1/2 -translate-y-1/2 z-[90]">
      <DeckPile />
    </div>
    <GameTable />
    <CombatDiceRail />
    <PlayerHand
      :opening-flow="openingFlow"
      :my-player-id="myPlayerId"
      :opening-action-pending="openingActionPending"
      @accept-opening-hand="$emit('accept-opening-hand')"
      @request-opening-mulligan="$emit('request-opening-mulligan')"
    />
    <TurnStatus :opening-flow-active="Boolean(openingFlow?.active)" />
    <ResourceDisplayPlayer />
    <ResourceDisplayOpponent />
  </div>
</template>

<script setup>
import OpponentHand from './OpponentHand.vue'
import DeckPile from './DeckPile.vue'
import GameTable from './GameTable.vue'
import CombatDiceRail from './CombatDiceRail.vue'
import PlayerHand from './PlayerHand.vue'
import TurnStatus from './TurnStatus.vue'
import ResourceDisplayPlayer from './ResourceDisplayPlayer.vue'
import ResourceDisplayOpponent from './ResourceDisplayOpponent.vue'

defineProps({
  openingFlow: {
    type: Object,
    required: true
  },
  myPlayerId: {
    type: Object,
    required: true
  },
  openingActionPending: {
    type: Boolean,
    default: false
  }
})

defineEmits(['accept-opening-hand', 'request-opening-mulligan'])
</script>
