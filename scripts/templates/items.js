/**
 * Item/Weapon Templates
 * Based on CARD_TEMPLATES.md
 * Stats ranges and never rules only - no text content
 */

export const itemTemplates = {
  offensive_weapon: {
    id: 'offensive_weapon',
    type: 'item',
    ranges: {
      atkBonus: { min: 1, max: 2 },
      defModifier: { min: -1, max: 0 }
    },
    baseCost: 2
  },

  defensive_gear: {
    id: 'defensive_gear',
    type: 'item',
    ranges: {
      defBonus: { min: 1, max: 2 },
      atkModifier: { min: -1, max: 0 }
    },
    baseCost: 2
  },

  high_risk_high_reward: {
    id: 'high_risk_high_reward',
    type: 'item',
    ranges: {
      atkBonus: { min: 2, max: 3 },
      defModifier: { min: -2, max: -1 }
    },
    baseCost: 3
  }
};

export const itemTemplateIds = Object.keys(itemTemplates);
