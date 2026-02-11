# CARD_TEMPLATES.md

Plantillas procedurales vigentes usadas por `scripts/generate-batch.js`.

---

## 1. Héroes

### balanced_fighter
- `atk`: 5-8
- `def`: 5-8
- `hp`: 8-10
- `baseCost`: 3

### glass_cannon
- `atk`: 5-8
- `def`: 5-8
- `hp`: 6-8
- `baseCost`: 3

### tank
- `atk`: 5-8
- `def`: 5-8
- `hp`: 10-12
- `baseCost`: 4

### skirmisher
- `atk`: 5-8
- `def`: 5-8
- `hp`: 7-9
- `baseCost`: 2

### fragile_support
- `atk`: 5-8
- `def`: 5-8
- `hp`: 6-8
- `baseCost`: 2

---

## 2. Ítems

Los ítems no tienen durabilidad.

### offensive_weapon
- `atkBonus`: 1-2
- `defModifier`: -1 a 0
- `baseCost`: 2

### defensive_gear
- `defBonus`: 1-2
- `atkModifier`: -1 a 0
- `baseCost`: 2

### high_risk_high_reward
- `atkBonus`: 2-3
- `defModifier`: -2 a -1
- `baseCost`: 3

---

## 3. Reactivas

### damage_mitigation
- `effect`: `reduce_damage`
- `damageReduction`: 1-2
- `baseCost`: 1

### critical_control
- `effect`: `cancel_critical`
- sin stat numérico
- `baseCost`: 2

### survival_trick
- `effect`: `prevent_death`
- sin stat numérico
- `baseCost`: 3

---

## 4. Curación

### minor_heal
- `healAmount`: 1-2
- `baseCost`: 1

### emergency_heal
- `healAmount`: 2-3
- `baseCost`: 2

---

## 5. Contraataque

### quick_riposte
- `counterDamage`: 1
- `baseCost`: 1

### guarded_strike
- `counterDamage`: 1-2
- `baseCost`: 2

---

## 6. Notas

- El costo final de carta se deriva de `baseCost` + evaluación de poder en `scripts/generate-batch.js`.
- Este documento describe el estado actual del generador, no objetivos futuros de diseño.
