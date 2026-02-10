#!/usr/bin/env node
/**
 * Batch Generator Script
 * Generates a batch of cards as JSON
 * 
 * Usage: node scripts/generate-batch.js
 * Output: data/batches/batch-{uuid}.json
 */

import { randomUUID } from 'crypto';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  heroTemplates,
  heroTemplateIds,
  itemTemplates,
  itemTemplateIds,
  reactiveTemplates,
  reactiveTemplateIds,
  healingTemplates,
  healingTemplateIds,
  counterattackTemplates,
  counterattackTemplateIds
} from './templates/index.js';

// =============================================================================
// CONFIGURATION - Adjust these values to tune batch generation
// =============================================================================

const BATCH_SIZE = 50;

// Distribution percentages (must sum to 1.0)
const DISTRIBUTION = {
  hero: 0.25,      // ~25% = 12-13 cards
  item: 0.30,      // ~30% = 15 cards
  reactive: 0.15,  // ~15% = 7-8 cards
  healing: 0.10,   // ~10% = 5 cards
  counterattack: 0.20 // ~20% = 10 cards
};

// Minimum cards per type (validation)
const MIN_CARDS = {
  hero: 10,
  item: 10,
  reactive: 6,
  healing: 5,
  counterattack: 5
};
const HERO_ATK_DEF_AVG_MAX_GAP = 1.0;

// Output directory (relative to project root)
const OUTPUT_DIR = 'data/batches';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick random element from array
 */
function randomPick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Generate stats from template ranges
 */
function generateStats(ranges) {
  const stats = {};
  for (const [key, range] of Object.entries(ranges)) {
    stats[key] = randomInt(range.min, range.max);
  }
  return stats;
}

function evaluateCardPower(type, template, stats) {
  if (type === 'hero') {
    const atk = Number(stats.atk || 0);
    const def = Number(stats.def || 0);
    const hp = Number(stats.hp || 0);
    return (atk * 1.0) + (def * 1.0) + (hp * 0.8);
  }

  if (type === 'item') {
    const atkBonus = Number(stats.atkBonus || 0);
    const defBonus = Number(stats.defBonus || 0);
    const atkModifier = Number(stats.atkModifier || 0);
    const defModifier = Number(stats.defModifier || 0);
    const durability = Number(stats.durability || 0);
    return ((atkBonus + defBonus) * 1.2) + ((atkModifier + defModifier) * 0.8) + (durability * 0.6);
  }

  if (type === 'healing') {
    return Number(stats.healAmount || 0);
  }

  if (type === 'counterattack') {
    return Number(stats.counterDamage || 0);
  }

  if (type === 'reactive') {
    if (template.effect === 'reduce_damage') return Number(stats.damageReduction || 0);
    if (template.effect === 'cancel_critical') return 2;
    if (template.effect === 'prevent_death') return 3;
  }

  return 0;
}

function getDerivedCostByType(type, power) {
  if (type === 'hero') {
    return clamp(Math.round((power / 3.2) - 2), 2, 6);
  }
  if (type === 'item') {
    return clamp(Math.round(power), 1, 4);
  }
  if (type === 'healing') {
    return clamp(Math.round(power * 0.8), 1, 3);
  }
  if (type === 'counterattack') {
    return clamp(Math.round(power * 1.2), 1, 3);
  }
  if (type === 'reactive') {
    return clamp(Math.round(power), 1, 4);
  }
  return 1;
}

function calculateCardCost(type, template, stats) {
  const power = evaluateCardPower(type, template, stats);
  const derivedCost = getDerivedCostByType(type, power);
  const baseCost = Number(template.baseCost || 0);
  // Weighted blend: keep template intent while making stronger rolls cost more.
  return clamp(Math.round(((derivedCost * 2) + baseCost) / 3), 1, 10);
}

/**
 * Create a unique signature for a card (for duplicate detection)
 * Only prevents exact stat duplicates within same template
 */
function cardSignature(card) {
  return `${card.template}_${JSON.stringify(card.stats)}`;
}

/**
 * Calculate max unique combinations for a template
 */
function countCombinations(template) {
  if (!template.ranges || Object.keys(template.ranges).length === 0) {
    return 1; // No variable stats = 1 combination
  }
  
  let combinations = 1;
  for (const range of Object.values(template.ranges)) {
    combinations *= (range.max - range.min + 1);
  }
  return combinations;
}

/**
 * Calculate total possible unique cards for a type
 */
function maxUniqueCards(templates) {
  return Object.values(templates).reduce((sum, t) => sum + countCombinations(t), 0);
}

// =============================================================================
// CARD GENERATORS
// =============================================================================

function generateHeroCard(template) {
  const stats = generateStats(template.ranges);
  return {
    id: randomUUID(),
    type: 'hero',
    template: template.id,
    name: { en: '', es: '' },
    description: { en: '', es: '' },
    stats: {
      atk: stats.atk,
      def: stats.def,
      hp: stats.hp
    },
    cost: calculateCardCost('hero', template, stats)
  };
}

function generateItemCard(template) {
  const stats = generateStats(template.ranges);
  return {
    id: randomUUID(),
    type: 'item',
    template: template.id,
    name: { en: '', es: '' },
    description: { en: '', es: '' },
    stats: {
      atkBonus: stats.atkBonus || 0,
      defBonus: stats.defBonus || 0,
      atkModifier: stats.atkModifier || 0,
      defModifier: stats.defModifier || 0,
      durability: stats.durability
    },
    cost: calculateCardCost('item', template, stats)
  };
}

function generateReactiveCard(template) {
  const stats = generateStats(template.ranges);
  return {
    id: randomUUID(),
    type: 'reactive',
    template: template.id,
    name: { en: '', es: '' },
    description: { en: '', es: '' },
    effect: template.effect,
    stats: {
      damageReduction: stats.damageReduction || null
    },
    cost: calculateCardCost('reactive', template, stats)
  };
}

function generateHealingCard(template) {
  const stats = generateStats(template.ranges);
  return {
    id: randomUUID(),
    type: 'healing',
    template: template.id,
    name: { en: '', es: '' },
    description: { en: '', es: '' },
    stats: {
      healAmount: stats.healAmount
    },
    cost: calculateCardCost('healing', template, stats)
  };
}

function generateCounterattackCard(template) {
  const stats = generateStats(template.ranges);
  return {
    id: randomUUID(),
    type: 'counterattack',
    template: template.id,
    name: { en: '', es: '' },
    description: { en: '', es: '' },
    stats: {
      counterDamage: stats.counterDamage
    },
    cost: calculateCardCost('counterattack', template, stats)
  };
}

// =============================================================================
// BATCH GENERATION
// =============================================================================

function calculateDistribution(batchSize) {
  const counts = {
    hero: Math.round(batchSize * DISTRIBUTION.hero),
    item: Math.round(batchSize * DISTRIBUTION.item),
    reactive: Math.round(batchSize * DISTRIBUTION.reactive),
    healing: Math.round(batchSize * DISTRIBUTION.healing),
    counterattack: Math.round(batchSize * DISTRIBUTION.counterattack)
  };
  
  // Adjust to match exact batch size
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const diff = batchSize - total;
  
  if (diff !== 0) {
    // Add/remove from largest category
    const largest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    counts[largest] += diff;
  }
  
  return counts;
}

function generateBatch() {
  const batchId = randomUUID();
  const cards = [];
  const signaturesByType = {
    hero: new Set(),
    item: new Set(),
    reactive: new Set(),
    healing: new Set(),
    counterattack: new Set()
  };
  const distribution = calculateDistribution(BATCH_SIZE);
  
  const generators = {
    hero: () => generateHeroCard(heroTemplates[randomPick(heroTemplateIds)]),
    item: () => generateItemCard(itemTemplates[randomPick(itemTemplateIds)]),
    reactive: () => generateReactiveCard(reactiveTemplates[randomPick(reactiveTemplateIds)]),
    healing: () => generateHealingCard(healingTemplates[randomPick(healingTemplateIds)]),
    counterattack: () => generateCounterattackCard(counterattackTemplates[randomPick(counterattackTemplateIds)])
  };
  
  // Calculate max unique cards per type
  const maxUnique = {
    hero: maxUniqueCards(heroTemplates),
    item: maxUniqueCards(itemTemplates),
    reactive: maxUniqueCards(reactiveTemplates),
    healing: maxUniqueCards(healingTemplates),
    counterattack: maxUniqueCards(counterattackTemplates)
  };
  
  // Generate cards for each type
  for (const [type, count] of Object.entries(distribution)) {
    let generated = 0;
    let attempts = 0;
    const maxAttempts = count * 20;
    const signatures = signaturesByType[type];
    const allowDuplicates = count > maxUnique[type];
    
    if (allowDuplicates) {
      console.log(`   Note: ${type} needs ${count} cards but only ${maxUnique[type]} unique combinations exist. Allowing stat duplicates.`);
    }
    
    while (generated < count && attempts < maxAttempts) {
      const card = generators[type]();
      const sig = cardSignature(card);
      
      // Allow duplicates if we need more cards than unique combinations
      if (allowDuplicates || !signatures.has(sig)) {
        signatures.add(sig);
        cards.push(card);
        generated++;
      }
      attempts++;
    }
    
    if (generated < count) {
      console.warn(`Warning: Could only generate ${generated}/${count} ${type} cards`);
    }
  }
  
  // Shuffle cards
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  
  return {
    batch_id: batchId,
    created_at: new Date().toISOString(),
    config: {
      batch_size: BATCH_SIZE,
      distribution: DISTRIBUTION
    },
    summary: {
      total: cards.length,
      by_type: {
        hero: cards.filter(c => c.type === 'hero').length,
        item: cards.filter(c => c.type === 'item').length,
        reactive: cards.filter(c => c.type === 'reactive').length,
        healing: cards.filter(c => c.type === 'healing').length,
        counterattack: cards.filter(c => c.type === 'counterattack').length
      }
    },
    cards
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateBatch(batch) {
  const errors = [];
  
  // Check total size
  if (batch.cards.length !== BATCH_SIZE) {
    errors.push(`Batch size is ${batch.cards.length}, expected ${BATCH_SIZE}`);
  }
  
  // Check minimum cards per type
  for (const [type, min] of Object.entries(MIN_CARDS)) {
    const count = batch.summary.by_type[type];
    if (count < min) {
      errors.push(`Only ${count} ${type} cards, minimum is ${min}`);
    }
  }
  
  // Check for duplicate IDs (not stats - stats can repeat)
  const ids = new Set();
  for (const card of batch.cards) {
    if (ids.has(card.id)) {
      errors.push(`Duplicate card ID found: ${card.id}`);
    }
    ids.add(card.id);
  }

  // Check hero attack/defense average balance
  const heroes = batch.cards.filter((card) => card.type === 'hero');
  if (heroes.length > 0) {
    const atkAvg = heroes.reduce((sum, card) => sum + (Number(card?.stats?.atk) || 0), 0) / heroes.length;
    const defAvg = heroes.reduce((sum, card) => sum + (Number(card?.stats?.def) || 0), 0) / heroes.length;
    const gap = Math.abs(atkAvg - defAvg);
    if (gap > HERO_ATK_DEF_AVG_MAX_GAP) {
      errors.push(
        `Hero atk/def average gap too high (${gap.toFixed(2)}). atk=${atkAvg.toFixed(2)}, def=${defAvg.toFixed(2)}`
      );
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// =============================================================================
// MAIN
// =============================================================================

function main() {
  console.log('🎲 Generating batch...');
  console.log(`   Batch size: ${BATCH_SIZE}`);
  console.log(`   Distribution: ${JSON.stringify(DISTRIBUTION)}`);
  console.log('');
  
  const batch = generateBatch();
  const validation = validateBatch(batch);
  
  if (!validation.valid) {
    console.error('❌ Batch validation failed:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    process.exit(1);
  }
  
  // Create output directory
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const projectRoot = join(__dirname, '..');
  const outputDir = join(projectRoot, OUTPUT_DIR);
  
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Write batch file (overwrite)
  const filename = 'batch.json';
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, JSON.stringify(batch, null, 2));
  
  console.log('✅ Batch generated successfully!');
  console.log('');
  console.log('   Summary:');
  console.log(`   - Heroes:   ${batch.summary.by_type.hero}`);
  console.log(`   - Items:    ${batch.summary.by_type.item}`);
  console.log(`   - Reactive: ${batch.summary.by_type.reactive}`);
  console.log(`   - Healing:  ${batch.summary.by_type.healing}`);
  console.log(`   - Counter:  ${batch.summary.by_type.counterattack}`);
  console.log(`   - Total:    ${batch.summary.total}`);
  console.log('');
  console.log(`   Output: ${filepath}`);
}

main();
