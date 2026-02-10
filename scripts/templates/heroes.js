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
      atk: { min: 5, max: 8 },
      def: { min: 5, max: 8 },
      hp: { min: 8, max: 10 }
    },
    baseCost: 3
  },

  glass_cannon: {
    id: 'glass_cannon',
    type: 'hero',
    ranges: {
      atk: { min: 5, max: 8 },
      def: { min: 5, max: 8 },
      hp: { min: 6, max: 8 }
    },
    baseCost: 3
  },

  tank: {
    id: 'tank',
    type: 'hero',
    ranges: {
      atk: { min: 5, max: 8 },
      def: { min: 5, max: 8 },
      hp: { min: 10, max: 12 }
    },
    baseCost: 4
  },

  skirmisher: {
    id: 'skirmisher',
    type: 'hero',
    ranges: {
      atk: { min: 5, max: 8 },
      def: { min: 5, max: 8 },
      hp: { min: 7, max: 9 }
    },
    baseCost: 2
  },

  fragile_support: {
    id: 'fragile_support',
    type: 'hero',
    ranges: {
      atk: { min: 5, max: 8 },
      def: { min: 5, max: 8 },
      hp: { min: 6, max: 8 }
    },
    baseCost: 2
  }
};

export const heroTemplateIds = Object.keys(heroTemplates);
