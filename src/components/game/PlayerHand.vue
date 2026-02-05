<template>
  <div class="absolute bottom-0 h-[140px] flex justify-center items-end pointer-events-none z-[100]">
    <div class="flex justify-center items-end pointer-events-auto">
      <div
        v-for="(card, index) in myHand"
        :key="card.id"
        class="
          group
          -ml-[50px] first:ml-0
          cursor-pointer
          transition-all duration-200
          [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]
          [transform-origin:bottom_center]
          [transform:var(--card-transform)]
          [z-index:var(--card-z)]
          hover:[transform:var(--card-transform-hover)]
          hover:[z-index:var(--card-z-hover)]
        "
        :style="getCardStyle(index)"
      >
        <Card
          :card="card"
          class="
            shadow-md shadow-black/20
            transition-shadow duration-200
            group-hover:shadow-2xl
          "
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayersStore, useConnectionStore } from '@/stores'
import Card from './Card.vue'

const connection = useConnectionStore()
const players = usePlayersStore()

const myPlayerId = computed(() =>
  connection.isHost ? 'player_a' : 'player_b'
)
const myHand = computed(() => players.players[myPlayerId.value].hand)

function getCardStyle(index) {
  const total = myHand.value.length
  if (!total) return {}

  const centerOffset =
    (index - (total - 1) / 2) / Math.max(total - 1, 1)

  const rotation = centerOffset * 16
  const verticalOffset = Math.pow(centerOffset * 2, 2) * 25

  return {
    '--card-transform': `
      translateY(calc(50% + ${verticalOffset}px))
      rotate(${rotation}deg)
    `,
    '--card-transform-hover': `
      translateY(0px)
      rotate(0deg)
      scale(1.08)
    `,
    '--card-z': index + 1,
    '--card-z-hover': total + 20
  }
}
</script>
