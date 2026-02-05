/**
 * Healing Card Templates
 * Based on CARD_TEMPLATES.md
 * Stats ranges and never rules only - no text content
 */

export const healingTemplates = {
  minor_heal: {
    id: 'minor_heal',
    type: 'healing',
    ranges: {
      healAmount: { min: 1, max: 2 }
    },
    baseCost: 1
  },

  emergency_heal: {
    id: 'emergency_heal',
    type: 'healing',
    ranges: {
      healAmount: { min: 2, max: 3 }
    },
    baseCost: 2
  }
};

export const healingTemplateIds = Object.keys(healingTemplates);
