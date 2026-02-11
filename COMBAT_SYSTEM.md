# COMBAT_SYSTEM.md

Sistema de combate vigente en el PMV.

---

## 1. Principios

- El combate se resuelve ataque por ataque.
- Cada ataque usa dos tiradas d20: atacante y defensor.
- No hay ataques simultáneos.

---

## 2. Quién puede atacar

- Un héroe puede atacar como máximo una vez por fase de combate.
- No puede atacar si está muerto o con summoning sickness.
- Solo se ataca a héroes (no daño directo a jugador).

---

## 3. Secuencia de un ataque

1. Declaración de atacante y defensor.
2. Tiradas d20 (atacante/defensor).
3. Cálculo de daño base con stats e ítems.
4. Ventana defensiva (solo defensor, una carta máximo).
5. Resolución final: daño al defensor, contraataque si aplica, bajas.
6. Cierre del ataque.

---

## 4. Fórmula de daño principal

`damage = max(0, (ATK + d20_atacante) - (DEF + d20_defensor))`

- Si atacante saca 1 natural: `damage = 0`.
- Si atacante saca 20 natural: `damage += 2` (bono crítico actual).

---

## 5. Ventana defensiva

- Solo defensor.
- Solo una carta (`reactive`, `counterattack` o `healing`).
- La tirada ya es conocida al reaccionar.

Reactivos implementados:

- `reduce_damage`: reduce daño por `stats.damageReduction`.
- `cancel_critical`: quita bono crítico y marca el ataque como no crítico.
- `prevent_death`: ajusta daño para dejar al defensor en 1 HP.

Contraataque implementado:

`counterFinal = max(0, (counterDamage + d20_contraataque) - (DEF_atacante + d20_contradefensa))`

- 1 natural en contraataque: `counterFinal = 0`.
- 20 natural en contraataque: `counterFinal += 2`.

Curación reactiva:

- Solo a héroes vivos.
- No revive.
- Puede salvar al defensor si sube su HP antes de aplicar daño final.

---

## 6. Persistencia

- El daño persiste entre turnos.
- Los ítems no se desgastan ni se rompen por combate.
- Muerte en 0 HP es permanente.

---

## 7. Restricciones

No existen:

- Pila de efectos
- Reacciones fuera de ventana
- Reacciones del atacante
- Rerolls
- Daño diferido
