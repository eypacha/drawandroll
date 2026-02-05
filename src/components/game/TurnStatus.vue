<template>
  <div class="absolute bottom-0 right-0 py-3 px-4 font-semibold w-42 text-right z-101">
    <span v-if="isMyTurn">Your Turn</span>
    <span v-else>Opponent Turn</span>
    <div class="text-xs font-normal opacity-80">
      {{ phaseLabel }}
    </div>
    <button
      v-if="isMyTurn && advanceLabel"
      class="mt-2 px-3 py-1 text-xs rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors"
      @click="advance"
    >
      {{ advanceLabel }}
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useGameStore, useConnectionStore } from '@/stores'
import { sendMessage } from '@/services/peerService'

const game = useGameStore()
const connection = useConnectionStore()
const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')
const isMyTurn = computed(() => game.currentTurn === myPlayerId.value)
const phaseLabel = computed(() => {
  const map = {
    draw: 'Draw',
    recruit: 'Recruit',
    combat: 'Combat',
    end: 'End'
  }
  return map[game.turnPhase] || ''
})

const advanceLabel = computed(() => {
  if (game.turnPhase === 'combat') return 'End Turn'
  if (game.turnPhase === 'recruit') {
    return game.turn === 1 ? 'End Turn' : 'To Combat'
  }
  if (game.turnPhase === 'end') return 'End Turn'
  return ''
})

function advance() {
  if (!isMyTurn.value) return
  game.advancePhase()
  sendMessage({
    type: 'advance_phase',
    payload: {
      turn: game.turn,
      currentTurn: game.currentTurn,
      turnPhase: game.turnPhase
    }
  })
}
</script>
