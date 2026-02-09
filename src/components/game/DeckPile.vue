<template>
  <div class="deck-pile" aria-label="Shared deck">
    <div class="stack-layer stack-layer-a">
      <CardBack />
    </div>
    <div class="stack-layer stack-layer-b">
      <CardBack />
    </div>
    <div class="stack-layer stack-layer-main">
      <CardBack />
    </div>
    <div class="deck-count">{{ deck.cardsRemaining }}</div>
  </div>
</template>

<script setup>
import { useDeckStore } from '@/stores'
import CardBack from './CardBack.vue'

const deck = useDeckStore()
</script>

<style scoped>
.deck-pile {
  position: relative;
  width: 110px;
  height: 165px;
  pointer-events: none;
}

.stack-layer {
  position: absolute;
  inset: 0;
}

.stack-layer-a {
  transform: translate(-8px, 6px);
  opacity: 0.9;
}

.stack-layer-b {
  transform: translate(-4px, 3px);
  opacity: 0.95;
}

.stack-layer-main {
  transform: translate(0, 0);
}

.deck-count {
  position: absolute;
  right: -10px;
  bottom: -12px;
  min-width: 34px;
  height: 34px;
  border-radius: 9999px;
  border: 2px solid #e5e7eb;
  background: #111827;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
  z-index: 20;
}
</style>
