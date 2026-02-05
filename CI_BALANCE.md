# CI_BALANCE.md

Este documento define **cómo se mide el balance del juego mediante simulaciones automáticas (CI)**.

El objetivo del CI **no es optimizar diversión**,  
sino **detectar roturas estructurales** del sistema.

---

## 1. Objetivo del CI

El sistema de CI existe para:

- Detectar partidas demasiado cortas o demasiado largas
- Detectar efectos dominantes (críticos, reactivos, plantillas)
- Validar que los cambios de código no rompan el ritmo del juego
- Proteger el PMV de regresiones graves

El CI **no decide diseño**, solo **alerta problemas**.

---

## 2. Enfoque general

- Las simulaciones se realizan **bot vs bot**
- Los bots:
  - siguen reglas válidas
  - no “hacen trampa”
  - no intentan jugar óptimo
- El objetivo es **comportamiento promedio**, no excelencia táctica

El CI mide **sistemas**, no habilidad.

---

## 3. Tipos de bots (PMV)

Para el PMV se definen bots simples y deterministas.

### 3.1 Bot básico (Baseline Bot)

Comportamiento:
- Recluta héroes si tiene slots libres
- Prioriza atacar siempre que pueda
- Usa reactivos defensivos solo si:
  - el héroe moriría sin usarlos
- No bluffea
- No guarda recursos a largo plazo

Este bot es la referencia mínima.

---

### 3.2 Bot agresivo (opcional)

Comportamiento:
- Prioriza ATK alto
- Ataca siempre que sea posible
- Gasta reactivos tarde o nunca

Sirve para detectar:
- snowball temprano
- presión excesiva del d20

---

### 3.3 Bot conservador (opcional)

Comportamiento:
- Prioriza supervivencia
- Usa reactivos temprano
- Evita atacar con héroes frágiles

Sirve para detectar:
- turtle infinito
- partidas que no cierran

---

## 4. Volumen de simulaciones

Para cada ejecución de CI:

- Mínimo: **50 partidas**
- Recomendado: **100 partidas**
- Todas las partidas:
  - usan lotes válidos
  - respetan las reglas del juego

Los resultados se analizan **en agregado**, nunca individualmente.

---

## 5. Métricas recolectadas

### 5.1 Métricas por partida

Por cada partida se registra:

- `batch_id`
- `turn_count`
- `winner`
- `total_attacks`
- `total_heroes_killed`

---

### 5.2 Métricas por turno

Por turno:

- `turn_number`
- `heroes_alive_player_a`
- `heroes_alive_player_b`
- `heroes_recruited_this_turn`

---

### 5.3 Métricas por ataque

Por ataque:

- `attacker_template`
- `defender_template`
- `r
