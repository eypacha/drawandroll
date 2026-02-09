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

    play_healing(payload) {
      const { playerId, card, cost, targetSlot, appliedHeal, hpBefore, hpAfter } = payload
      players.addHealingFromRemote(playerId, card, cost, targetSlot, appliedHeal, hpBefore, hpAfter)
    },

    advance_phase(payload) {
      const { turn, currentTurn, turnPhase } = payload
      game.setTurnState(turn, currentTurn, turnPhase)
    },

    game_end(payload) {
      const { winner } = payload
      game.endGame(winner)
    },

    end_turn_maintenance(payload) {
      const { playerId, heroes } = payload
      if (!playerId || !Array.isArray(heroes)) return
      players.players[playerId].heroes = heroes
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

    mulligan_reveal(payload) {
      const { playerId, cards } = payload
      players.setMulliganReveal(playerId, cards)
    },

    mulligan_remove_one(payload) {
      const { playerId, cardId } = payload
      players.removeCardFromHand(playerId, cardId)
      players.removeMulliganRevealCard(playerId, cardId)
    },

    mulligan_clear(payload) {
      const { playerId } = payload
      players.clearMulliganReveal(playerId)
    },

    mulligan_deck_sync(payload) {
      const { deckCards } = payload
      if (Array.isArray(deckCards)) {
        deck.cards = deckCards
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
