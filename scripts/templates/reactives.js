/**
 * Reactive Defensive Card Templates
 * Based on CARD_TEMPLATES.md
 * Stats ranges and never rules only - no text content
 */

export const reactiveTemplates = {
  damage_mitigation: {
    id: 'damage_mitigation',
    type: 'reactive',
    effect: 'reduce_damage',
    ranges: {
      damageReduction: { min: 1, max: 2 }
    },
    baseCost: 1
  },

  critical_control: {
    id: 'critical_control',
    type: 'reactive',
    effect: 'cancel_critical',
    ranges: {},
    baseCost: 2
  },

  survival_trick: {
    id: 'survival_trick',
    type: 'reactive',
    effect: 'prevent_death',
    ranges: {},
    baseCost: 3
  }
};

export const reactiveTemplateIds = Object.keys(reactiveTemplates);
