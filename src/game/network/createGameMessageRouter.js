import batchData from '@/../data/batches/batch.json'

export function createGameMessageRouter({ deck, game, players, resetLocalGameState }) {
  const handlers = {
    game_init(payload) {
      if (typeof resetLocalGameState === 'function') {
        resetLocalGameState()
      }
      deck.loadBatch(batchData)
      deck.cards = payload.deckCards
      const initialTurnPhase = payload.turnPhase || 'recruit'
      game.startGame(payload.initialTurn, initialTurnPhase)
    },

    recruit_hero(payload) {
      const { playerId, card, cost, slotIndex } = payload
      players.addHeroFromRemote(playerId, card, cost, slotIndex)
    },

    equip_item(payload) {
      const { playerId, card, cost, slotIndex } = payload
      players.addItemFromRemote(playerId, card, cost, slotIndex)
    },

    advance_phase(payload) {
      const { turn, currentTurn, turnPhase } = payload
      game.setTurnState(turn, currentTurn, turnPhase)
    },

    game_end(payload) {
      const { winner } = payload
      game.endGame(winner)
    },

    draw_card(payload) {
      const { playerId, card } = payload
      deck.removeCardById(card.id)
      players.addToHand(playerId, [card])
    },

    discard_hand(payload) {
      const { playerId, cardIds } = payload
      const discardedCards = players.discardFromHand(playerId, cardIds)
      for (const card of discardedCards) {
        deck.discard(card)
      }
    },

    hover_card(payload) {
      const { playerId, cardId } = payload
      if (cardId) {
        players.setHoveredCard(playerId, cardId)
      } else {
        players.clearHoveredCard(playerId)
      }
    }
  }

  return function routeGameMessage(data) {
    console.log('[Game] Received:', data)
    const handler = handlers[data?.type]
    if (!handler) return false
    handler(data.payload || {})
    return true
  }
}
