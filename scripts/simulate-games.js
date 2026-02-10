#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { hashSeed } from './lib/rng.js'
import { runSimulation } from './lib/simEngine.js'

function printHelp() {
  process.stdout.write([
    'Usage: node scripts/simulate-games.js --games <int> [options]',
    '',
    'Options:',
    '  --games <int>       Number of games to simulate (required)',
    '  --seed <value>      Optional seed (number or string)',
    '  --json              Print JSON output after summary',
    '  --out <path>        Write JSON output to file',
    '  --verbose           Log each simulated game',
    '  --max-turns <int>   Max turns before timeout (default: 200)',
    '  --batch <path>      Batch JSON path (default: data/batches/batch.json)',
    '  --help              Show this help'
  ].join('\n') + '\n')
}

function parseArgs(argv) {
  const options = {
    games: null,
    seed: null,
    json: false,
    out: null,
    verbose: false,
    maxTurns: 200,
    batch: 'data/batches/batch.json'
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      options.help = true
      return options
    }

    if (arg === '--json') {
      options.json = true
      continue
    }

    if (arg === '--verbose') {
      options.verbose = true
      continue
    }

    if (arg === '--games') {
      options.games = Number(argv[i + 1])
      i += 1
      continue
    }

    if (arg === '--seed') {
      options.seed = argv[i + 1]
      i += 1
      continue
    }

    if (arg === '--out') {
      options.out = argv[i + 1]
      i += 1
      continue
    }

    if (arg === '--max-turns') {
      options.maxTurns = Number(argv[i + 1])
      i += 1
      continue
    }

    if (arg === '--batch') {
      options.batch = argv[i + 1]
      i += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function validateOptions(options) {
  if (!Number.isInteger(options.games) || options.games <= 0) {
    throw new Error('Invalid --games. It must be an integer > 0.')
  }

  if (!Number.isInteger(options.maxTurns) || options.maxTurns <= 0) {
    throw new Error('Invalid --max-turns. It must be an integer > 0.')
  }

  if (!options.batch) {
    throw new Error('Missing --batch path.')
  }

  if (options.out && !options.json) {
    throw new Error('--out requires --json.')
  }
}

function loadBatch(batchPath) {
  const absolutePath = resolve(batchPath)
  let parsed
  try {
    parsed = JSON.parse(readFileSync(absolutePath, 'utf8'))
  } catch (error) {
    throw new Error(`Failed to read batch file at ${absolutePath}: ${error.message}`)
  }

  if (!parsed || !Array.isArray(parsed.cards)) {
    throw new Error(`Invalid batch format at ${absolutePath}: missing cards array.`)
  }

  return {
    absolutePath,
    batch: parsed
  }
}

function formatNumber(value, digits = 2) {
  return Number(value || 0).toFixed(digits)
}

function printSummary({ config, aggregate }) {
  process.stdout.write('\n=== Simulation Summary ===\n')
  process.stdout.write(`Games: ${config.games}\n`)
  process.stdout.write(`Seed: ${config.seedRaw} (hash=${config.seedHash})\n`)
  process.stdout.write(`Batch: ${config.batchPath}\n`)
  process.stdout.write(`Max turns: ${config.maxTurns}\n\n`)

  process.stdout.write(`Starter wins: ${aggregate.winsStarter}/${aggregate.games} (${formatNumber(aggregate.starterWinRate * 100)}%)\n`)
  process.stdout.write(
    `Winners: player_a=${aggregate.winnerDistribution.player_a}, player_b=${aggregate.winnerDistribution.player_b}, none=${aggregate.winnerDistribution.none}\n\n`
  )

  process.stdout.write(
    `Turns avg/p50/p90/min/max: ${formatNumber(aggregate.turns.avg)} / ${formatNumber(aggregate.turns.p50)} / ${formatNumber(aggregate.turns.p90)} / ${aggregate.turns.min} / ${aggregate.turns.max}\n`
  )

  process.stdout.write(
    `Heroes killed total/avg: ${aggregate.heroesKilled.total} / ${formatNumber(aggregate.heroesKilled.avgPerGame)} (A:${aggregate.heroesKilled.playerA}, B:${aggregate.heroesKilled.playerB})\n`
  )

  process.stdout.write(
    `Combat avg attacks/damage: ${formatNumber(aggregate.combat.avgAttacksPerGame)} / ${formatNumber(aggregate.combat.avgDamagePerGame)}\n`
  )
  process.stdout.write(
    `Counter avg dmg/uses: ${formatNumber(aggregate.combat.avgCounterDamagePerGame)} / ${formatNumber(aggregate.reactions.avgCounterattacksPerGame)}\n`
  )
  process.stdout.write(
    `Healing avg amount/uses: ${formatNumber(aggregate.reactions.avgHealingPerGame)} / ${formatNumber(aggregate.reactions.avgHealingCardsPerGame)}\n`
  )
  process.stdout.write(
    `Healing efficiency: ${formatNumber(aggregate.reactions.healingEfficiencyPct)}% (overheal avg ${formatNumber(aggregate.reactions.avgHealingOverhealPerGame)})\n`
  )
  process.stdout.write(
    `Crits/Fumbles per 100 attacks: ${formatNumber(aggregate.combat.critsPer100Attacks)} / ${formatNumber(aggregate.combat.fumblesPer100Attacks)}\n`
  )
  process.stdout.write(
    `Attacker deaths by counter: ${aggregate.reactions.attackerDeathsByCounter}\n`
  )
  process.stdout.write(
    `Deaths prevented by healing: ${aggregate.reactions.healingPreventedDeaths}\n`
  )
  process.stdout.write(
    `Reaction damage prevented avg: ${formatNumber(aggregate.reactions.avgReactionDamagePreventedPerGame)}\n`
  )
  process.stdout.write(
    `Overkill avg/attack: ${formatNumber(aggregate.pressure.avgOverkillPerGame)} / ${formatNumber(aggregate.pressure.overkillPerAttack, 3)}\n`
  )

  process.stdout.write(
    `Economy draws/recruits/items/discards: ${aggregate.economy.cardsDrawnTotal} / ${aggregate.economy.cardsRecruitedTotal} / ${aggregate.economy.itemsEquippedTotal} / ${aggregate.economy.cardsDiscardedTotal}\n`
  )
  process.stdout.write(
    `Resources spend: ${aggregate.economy.resourcesSpentTotal}/${aggregate.economy.resourcesAvailableTotal} (${formatNumber(aggregate.economy.resourceSpendPct)}%) [H:${aggregate.economy.resourcesSpentHeroes} I:${aggregate.economy.resourcesSpentItems} He:${aggregate.economy.resourcesSpentHealing} R:${aggregate.economy.resourcesSpentReactions}]\n`
  )
  process.stdout.write(
    `Turn3 leader winrate: ${formatNumber(aggregate.snowball.leaderWinRateWhenDefined)}% (${aggregate.snowball.leaderTurn3Wins}/${aggregate.snowball.gamesWithLeaderTurn3}, reached=${aggregate.snowball.gamesReachedTurn3})\n`
  )
  process.stdout.write(
    `Mulligans: total=${aggregate.mulligan.total}, games=${aggregate.mulligan.gamesWithMulligan}/${aggregate.games} (${formatNumber(aggregate.mulligan.pctGamesWithMulligan)}%)\n`
  )

  process.stdout.write(`Ended by no heroes: ${aggregate.endedByNoHeroes}\n`)
  process.stdout.write(`Timeout games: ${aggregate.timeouts}\n`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()
    return
  }

  validateOptions(options)

  const { absolutePath: batchPath, batch } = loadBatch(options.batch)
  const seedRaw = options.seed ?? String(Date.now())
  const seedHash = hashSeed(seedRaw)

  const simulation = runSimulation({
    games: options.games,
    batchCards: batch.cards,
    baseSeed: seedHash,
    maxTurns: options.maxTurns,
    verbose: options.verbose
  })

  const config = {
    games: options.games,
    seedRaw,
    seedHash,
    batchPath,
    maxTurns: options.maxTurns,
    batchId: batch.batch_id || null
  }

  const report = {
    config,
    aggregate: simulation.aggregate,
    perGame: simulation.perGame
  }

  printSummary({ config, aggregate: simulation.aggregate })

  if (options.json) {
    const jsonText = JSON.stringify(report, null, 2)
    process.stdout.write('\n=== JSON ===\n')
    process.stdout.write(`${jsonText}\n`)

    if (options.out) {
      const outPath = resolve(options.out)
      writeFileSync(outPath, jsonText, 'utf8')
      process.stdout.write(`JSON written to ${outPath}\n`)
    }
  }
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`)
  process.stderr.write('Use --help for usage.\n')
  process.exitCode = 1
})
