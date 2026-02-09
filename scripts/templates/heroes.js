/**
 * Hero Templates
 * Based on CARD_TEMPLATES.md
 * Stats ranges and never rules only - no text content
 */

export const heroTemplates = {
  balanced_fighter: {
    id: 'balanced_fighter',
    type: 'hero',
    ranges: {
      atk: { min: 2, max: 3 },
      def: { min: 9, max: 11 },
      hp: { min: 6, max: 8 }
    },
    baseCost: 3
  },

  glass_cannon: {
    id: 'glass_cannon',
    type: 'hero',
    ranges: {
      atk: { min: 3, max: 4 },
      def: { min: 8, max: 9 },
      hp: { min: 4, max: 5 }
    },
    baseCost: 3
  },

  tank: {
    id: 'tank',
    type: 'hero',
    ranges: {
      atk: { min: 1, max: 2 },
      def: { min: 11, max: 13 },
      hp: { min: 8, max: 10 }
    },
    baseCost: 4
  },

  skirmisher: {
    id: 'skirmisher',
    type: 'hero',
    ranges: {
      atk: { min: 2, max: 3 },
      def: { min: 9, max: 10 },
      hp: { min: 5, max: 6 }
    },
    baseCost: 2
  },

  fragile_support: {
    id: 'fragile_support',
    type: 'hero',
    ranges: {
      atk: { min: 1, max: 2 },
      def: { min: 8, max: 9 },
      hp: { min: 4, max: 5 }
    },
    baseCost: 2
  }
};

export const heroTemplateIds = Object.keys(heroTemplates);
