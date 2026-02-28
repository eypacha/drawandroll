# GAME_RULES.md

Este documento define las reglas vigentes del juego PMV.

---

## 1. Jugadores

- El juego es para 2 jugadores.
- Ambos usan un mismo mazo compartido en la partida.

---

## 2. Objetivo

- La partida termina cuando un jugador queda sin héroes en mesa.
- En la implementación de juego actual, esta condición puede cerrarse inmediatamente tras resolver combate.

---

## 3. Información

- Mano: oculta.
- Mesa: visible (héroes, stats e ítems equipados).
- No hay información parcial ni estados ocultos complejos.

---

## 4. Tipos de cartas

1. Héroes
2. Ítems
3. Armas
4. Curación
5. Reactivas defensivas
6. Contraataques

---

## 5. Recursos

- Cada jugador tiene recursos fijos por turno (`6`).
- Se refrescan por completo al inicio de su turno.
- No se acumulan entre turnos.
- Gastan recursos: héroes, ítems, armas, curación y reacciones defensivas.

---

## 6. Héroes

- Máximo 3 héroes por jugador en mesa.
- Stats base: ATK, DEX, DEF, HP.
- AC (armor class) se calcula como `10 + DEX`.
- Reclutar héroes cuesta exactamente `card.cost` (sin escalado por héroes perdidos).
- Si un héroe llega a 0 HP, muere de forma permanente.
- No hay resurrección.

---

## 7. Estructura de turno

Fases en orden:

1. `draw` (robo)
2. `recruit` (jugar héroes, ítems y curación en turno propio)
3. `combat`
4. `discard` (si la mano supera límite)
5. cierre

Reglas especiales vigentes:

- Primer turno del jugador inicial: arranca en `recruit` (sin robo).
- Turno 1 del jugador inicial: no entra en fase de combate.
- Límite de mano al cierre: 7 cartas.

---

## 8. Ítems

- Los ítems modifican stats del héroe equipado.
- Los ítems no pueden modificar el dado de daño del héroe.
- Los ítems no tienen durabilidad.
- Los ítems permanecen hasta que el héroe muere.

## 8.1 Armas

- Cada héroe tiene 3 slots de equipamiento total compartidos entre armas e ítems.
- Máximo 1 arma por héroe.
- Combinaciones válidas: `1 arma + 2 ítems` o `3 ítems`.
- El dado de daño del héroe lo define el arma equipada (si no hay arma, usa base `1d2`).

---

## 11. Resolución de ataque

- Tirada de impacto: `1d20` del atacante contra AC del defensor.
- Si impacta, se tira daño con el dado actual del héroe (`1d2`, `1d4` o `1d6`) y se aplica mitigación por DEF.
- Si no impacta, el daño es 0.

---

## 9. Curación

- No hay curación automática.
- El daño persiste entre turnos.
- La curación no revive héroes.
- Puede jugarse en turno propio o como reacción defensiva.

---

## 10. Reacciones defensivas

- Solo el defensor puede reaccionar.
- Máximo 1 carta defensiva por ataque.
- Tipos válidos en ventana defensiva: `reactive`, `counterattack`, `healing`.

Efectos reactivos implementados:

- `reduce_damage`
- `cancel_critical`
- `prevent_death`

No hay pila de efectos ni respuestas del atacante en esa ventana.
