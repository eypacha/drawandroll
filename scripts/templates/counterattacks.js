/**
 * Counterattack Card Templates
 * Low fixed damage cards that resolve after main attack.
 */

export const counterattackTemplates = {
  quick_riposte: {
    id: 'quick_riposte',
    type: 'counterattack',
    ranges: {
      counterDamage: { min: 1, max: 1 }
    },
    baseCost: 1
  },

  guarded_strike: {
    id: 'guarded_strike',
    type: 'counterattack',
    ranges: {
      counterDamage: { min: 1, max: 2 }
    },
    baseCost: 2
  }
}

export const counterattackTemplateIds = Object.keys(counterattackTemplates)
