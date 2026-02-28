/**
 * Item/Weapon Templates
 * Based on CARD_TEMPLATES.md
 * Stats ranges and never rules only - no text content
 */

export const itemTemplates = {
  offensive_weapon: {
    id: 'offensive_weapon',
    type: 'weapon',
    ranges: {
      atkBonus: { min: 1, max: 2 },
      defModifier: { min: -1, max: 0 },
      damageDieSides: { min: 6, max: 6 }
    },
    baseCost: 2
  },

  defensive_gear: {
    id: 'defensive_gear',
    type: 'item',
    ranges: {
      defBonus: { min: 1, max: 2 },
      dexBonus: { min: 1, max: 2 },
      atkModifier: { min: -1, max: 0 }
    },
    baseCost: 2
  },

  high_risk_high_reward: {
    id: 'high_risk_high_reward',
    type: 'item',
    ranges: {
      atkBonus: { min: 2, max: 3 },
      dexModifier: { min: -1, max: 0 },
      defModifier: { min: -2, max: -1 }
    },
    baseCost: 3
  }
};

export const weaponTemplateIds = Object.entries(itemTemplates)
  .filter(([, template]) => template.type === 'weapon')
  .map(([id]) => id);

export const itemTemplateIds = Object.entries(itemTemplates)
  .filter(([, template]) => template.type === 'item')
  .map(([id]) => id);
