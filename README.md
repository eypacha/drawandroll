# Tactical Card Combat - PMV

Juego táctico por turnos basado en cartas, impacto con `1d20`, daño con `1d4`/`1d6` y muerte permanente.  
Diseñado software-first, con generación procedural controlada y foco en partidas cortas, tensas y repetibles.

Este repositorio implementa un PMV (Producto Mínimo Viable).  
No es un TCG, no es MTG-like, no es un deckbuilder.

---

## Stack tecnológico

- Framework: Vue 3
- Estilos: Tailwind CSS
- Estado: simple y explícito (sin overengineering)
- Objetivo técnico: PMV pulido con arquitectura limpia y UX refinada

---

## Visión del juego

- 2 jugadores
- Un único mazo compartido por partida
- Impacto táctico con 1d20 y daño por dado de arma (1d4/1d6)
- Muerte permanente de héroes
- Presión creciente por pérdidas de héroes
- Partidas cortas (en simulación bot-vs-bot promedian ~6 turnos)

---

## Alcance del PMV

El PMV debe permitir:

- Jugar partidas completas de principio a fin
- Entender reglas sin ambigüedad
- Repetir partidas en la misma sesión
- Ajustar números y probabilidades rápidamente

---

## Documentación del repositorio

Este README define la intención.
Las reglas y contratos viven en documentos separados:

- `GAME_RULES.md` - reglas cerradas del juego
- `COMBAT_SYSTEM.md` - combate y ventanas
- `CARD_TEMPLATES.md` - plantillas procedurales y rangos vigentes
- `BATCH_GENERATION.md` - generación y validación de lotes
- `CI_BALANCE.md` - simulación bot-vs-bot y métricas de balance

El código debe seguir estos documentos.
