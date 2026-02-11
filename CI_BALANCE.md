# CI_BALANCE.md

Este documento define cómo se mide el balance con simulación bot-vs-bot (`scripts/simulate-games.js`).

---

## 1. Objetivo

El CI de balance sirve para detectar regresiones estructurales:

- duración de partidas fuera de rango
- ventaja excesiva del jugador inicial
- snowball temprano
- dominancia de un tipo de reacción
- problemas de economía de recursos

No busca optimizar diversión por sí solo.

---

## 2. Motor y alcance

- Motor de simulación: `scripts/lib/simEngine.js`
- Entrada: `batch.cards` desde JSON
- Salida:
  - métricas por partida (`perGame`)
  - agregados (`aggregate`)

---

## 3. Bot baseline real (actual)

El simulador usa un único bot determinista (`scripts/lib/botBaseline.js`) para ambos lados.

Heurísticas vigentes:

- Recluta héroes en primer slot libre priorizando menor costo posible.
- Equipa ítems priorizando mayor costo y primer héroe válido.
- Cura en recruit si falta >=2 HP, priorizando héroe de mayor valor.
- Ataca siempre con héroes habilitados al primer objetivo enemigo vivo.
- Descarta por prioridad de tipo y costo.
- En reacción defensiva evalúa `reactive/counterattack/healing` y elige el mayor score de supervivencia/mitigación.

Bots agresivo y conservador no están implementados actualmente.

---

## 4. Volumen recomendado

- Smoke local: 100 partidas.
- Check estable: 1000 partidas.
- Gate de balance: 5000+ partidas por seed, idealmente varias seeds.

---

## 5. Métricas agregadas disponibles

### 5.1 Resultado y ritmo

- `games`
- `starterWinRate`
- `winnerDistribution`
- `turns.{min,max,avg,p50,p90}`
- `endedByNoHeroes`
- `timeouts`

### 5.2 Combate

- `combat.totalAttacks`
- `combat.avgAttacksPerGame`
- `combat.totalDamage`
- `combat.avgDamagePerGame`
- `combat.totalCounterDamage`
- `combat.avgCounterDamagePerGame`
- `combat.critsPer100Attacks`
- `combat.fumblesPer100Attacks`

### 5.3 Reacciones y curación

- `reactions.counterattacksUsed`
- `reactions.avgCounterattacksPerGame`
- `reactions.attackerDeathsByCounter`
- `reactions.healingCardsUsed`
- `reactions.avgHealingCardsPerGame`
- `reactions.healingTotal`
- `reactions.avgHealingPerGame`
- `reactions.healingPreventedDeaths`
- `reactions.healingOverhealTotal`
- `reactions.avgHealingOverhealPerGame`
- `reactions.healingEfficiencyPct`
- `reactions.reactionDamagePreventedTotal`
- `reactions.avgReactionDamagePreventedPerGame`

### 5.4 Economía

- `economy.cardsDrawnTotal`
- `economy.cardsRecruitedTotal`
- `economy.itemsEquippedTotal`
- `economy.cardsDiscardedTotal`
- `economy.avgDiscardsPerGame`
- `economy.resourcesSpentTotal`
- `economy.resourcesAvailableTotal`
- `economy.resourceSpendPct`
- `economy.resourcesSpentHeroes`
- `economy.resourcesSpentItems`
- `economy.resourcesSpentHealing`
- `economy.resourcesSpentReactions`

### 5.5 Presión y snowball

- `pressure.overkillDamageTotal`
- `pressure.avgOverkillPerGame`
- `pressure.overkillPerAttack`
- `snowball.gamesReachedTurn3`
- `snowball.gamesWithLeaderTurn3`
- `snowball.leaderTurn3Wins`
- `snowball.leaderWinRateWhenDefined`

---

## 6. Lectura rápida sugerida

- `starterWinRate` alto + `snowball.leaderWinRateWhenDefined` alto: ventaja de tempo inicial.
- `timeouts > 0`: riesgo de loops/partidas estancadas.
- `healingEfficiencyPct` muy baja: curación mal calibrada.
- `resourceSpendPct` baja: cartas/costos no convierten recursos en acciones útiles.
- `overkillPerAttack` alto: exceso de burst o priorización de objetivos ineficiente.

---

## 7. Comandos

- Simulación estándar:
  - `npm run simulate -- --games 1000 --seed <seed>`
- JSON para análisis externo:
  - `npm run simulate -- --games 1000 --seed <seed> --json --out report.json`

---

## 8. Known Gaps (Sim vs Runtime)

La simulación es útil para balance estructural, pero no replica 1:1 una partida humana en runtime.

- Targeting en combate:
  - Sim: el bot ataca siempre al primer héroe enemigo vivo.
  - Runtime: el jugador elige objetivo libremente.
- Reacciones defensivas:
  - Sim: selección automática por heurística de score (supervivencia/mitigación).
  - Runtime: decisión manual del jugador (puede ser subóptima o estratégica).
- Mulligan inicial:
  - Sim: mulligan automático solo si la mano inicial no tiene héroes.
  - Runtime: flujo interactivo de opening mulligan.
- Cierre de partida:
  - Sim: evalúa derrota en la lógica del loop/fin de turno del motor de simulación.
  - Runtime: puede cerrar inmediatamente tras combate cuando un lado queda sin héroes.
- Señales no modeladas:
  - Sim no modela UI, tiempos de reacción humanos, errores de ejecución ni efectos psicológicos.

Regla práctica: usar CI para dirección de balance macro; validar cambios finos con playtests humanos.
