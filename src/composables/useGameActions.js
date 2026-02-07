import { computed } from 'vue'
import { useConnectionStore, useGameStore, usePlayersStore } from '@/stores'
import { sendMessage } from '@/services/peerService'

export function useGameActions() {
  const connection = useConnectionStore()
  const game = useGameStore()
  const players = usePlayersStore()
  const myPlayerId = computed(() => connection.isHost ? 'player_a' : 'player_b')

  function advancePhase() {
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

  function playHeroToSlot(slotIndex, cardId) {
    const played = players.playHeroFromHand(myPlayerId.value, cardId, slotIndex)
    if (!played) return null
    sendMessage({
      type: 'recruit_hero',
      payload: {
        playerId: myPlayerId.value,
        card: played.card,
        cost: played.cost,
        slotIndex: played.slotIndex
      }
    })
    return played
  }

  function playItemToSlot(slotIndex, cardId) {
    const played = players.playItemFromHand(myPlayerId.value, cardId, slotIndex)
    if (!played) return null
    sendMessage({
      type: 'equip_item',
      payload: {
        playerId: myPlayerId.value,
        card: played.card,
        cost: played.cost,
        slotIndex: played.slotIndex
      }
    })
    return played
  }

  function setHoveredCard(cardId) {
    players.setHoveredCard(myPlayerId.value, cardId)
    sendMessage({
      type: 'hover_card',
      payload: { playerId: myPlayerId.value, cardId }
    })
  }

  function clearHoveredCard(expectedCardId = null) {
    if (expectedCardId && players.players[myPlayerId.value].hoveredCardId !== expectedCardId) {
      return false
    }
    players.clearHoveredCard(myPlayerId.value)
    sendMessage({
      type: 'hover_card',
      payload: { playerId: myPlayerId.value, cardId: null }
    })
    return true
  }

  return {
    advancePhase,
    playHeroToSlot,
    playItemToSlot,
    setHoveredCard,
    clearHoveredCard
  }
}
