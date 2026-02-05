import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

/**
 * Deck Store
 * Manages the shared deck, drawing, and discard pile
 */
export const useDeckStore = defineStore('deck', () => {
  // State
  const batchId = ref(null)
  const cards = ref([])
  const discardPile = ref([])

  // Getters
  const cardsRemaining = computed(() => cards.value.length)
  const isEmpty = computed(() => cards.value.length === 0)

  // Actions
  function loadBatch(batch) {
    batchId.value = batch.batch_id
    cards.value = [...batch.cards]
    discardPile.value = []
  }

  function shuffle() {
    for (let i = cards.value.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cards.value[i], cards.value[j]] = [cards.value[j], cards.value[i]]
    }
  }

  function draw(count = 1) {
    return cards.value.splice(0, count)
  }

  function discard(card) {
    discardPile.value.push(card)
  }

  function $reset() {
    batchId.value = null
    cards.value = []
    discardPile.value = []
  }

  return {
    // State
    batchId,
    cards,
    discardPile,
    // Getters
    cardsRemaining,
    isEmpty,
    // Actions
    loadBatch,
    shuffle,
    draw,
    discard,
    $reset
  }
})
