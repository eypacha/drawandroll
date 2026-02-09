# GAME_RULES.md

Este documento define **las reglas cerradas del juego**.  
El código **debe implementarlas tal como están escritas**, sin reinterpretaciones.

---

## 1. Jugadores

- El juego es para **2 jugadores**.
- Ambos usan el **mismo mazo compartido**.
- No hay asimetrías iniciales salvo las definidas explícitamente.

---

## 2. Objetivo del juego

> **Un jugador pierde la partida si termina su turno sin héroes en mesa.**

No existen otras condiciones de victoria o derrota.

---

## 3. Información

- **Mano**: oculta.
- **Mazo**: compartido, conocido conceptualmente, no contable.
- **Mesa**: completamente visible.
  - héroes
  - stats
  - ítems equipados
  - durabilidad
- No existen cartas boca arriba en mano.
- No existe información parcial o condicional.

---

## 4. Tipos de cartas

El juego utiliza los siguientes tipos de cartas:

1. **Héroes**
2. **Ítems / Armas**
3. **Curación**
4. **Cartas reactivas defensivas**
5. **Cartas de contraataque**

No existen subtipos activos, tags ni keywords sistémicas en el PMV.

---

## 5. Recursos

- Cada jugador tiene una cantidad **fija de recursos**.
- Los recursos:
  - se renuevan completamente al inicio de cada turno
  - no se acumulan entre turnos
- Todas las acciones cuestan recursos:
  - reclutar héroes
  - equipar ítems
  - usar curación
  - usar reactivos defensivos
  - usar contraataques defensivos

---

## 6. Héroes

### 6.1 Mesa de héroes
- Cada jugador puede tener **hasta 3 héroes** en mesa.
- No se puede superar este límite bajo ninguna circunstancia.

### 6.2 Stats
Cada héroe tiene:
- **ATK**
- **DEF**
- **HP**

Los stats son visibles y no ocultables.

### 6.3 Muerte permanente
- Si un héroe llega a **0 HP**, muere.
- Un héroe muerto:
  - sale del juego
  - no vuelve nunca
  - no puede ser revivido

Existen cartas extremadamente raras que pueden **evitar una muerte ese turno**, pero nunca revivir.

---

## 7. Turno de juego

Un turno se resuelve siempre en este orden:

### 1️⃣ Inicio de turno
- Se renuevan los recursos del jugador activo.

### 2️⃣ Robo
- El jugador roba cartas del mazo compartido.
- La cantidad de robo es fija (definida por implementación).

### 3️⃣ Reclutamiento y equipamiento
- El jugador puede jugar cartas de **héroe** pagando su costo.
- No puede superar el límite de 3 héroes en mesa.
- El jugador puede equipar **ítems** a sus héroes en esta misma fase.
- Cada héroe tiene slots limitados (definido por plantilla).
- Los ítems modifican stats de forma inmediata.

### 4️⃣ Combate
- El jugador puede declarar ataques con sus héroes.
- **En el turno 1 no hay fase de combate.** (Se pasa directo al fin de turno.)
- El sistema de combate se define en `COMBAT_SYSTEM.md`.

### 5️⃣ Fin de turno
- Se verifica la condición de derrota:
  - si el jugador activo termina el turno sin héroes → pierde.

---

## 8. Ítems / Armas

- Los ítems:
  - modifican stats
  - ocupan slots
  - tienen **durabilidad**
- La durabilidad:
  - se reduce por uso
  - al llegar a 0, el ítem se destruye
- Ítems más poderosos tienen menos durabilidad.
- Todos los ítems y modificadores son visibles.

---

## 9. Curación

- No existe curación automática.
- El daño **persiste entre turnos**.
- La curación:
  - es consumible
  - cuesta recursos
  - no revive héroes
- Puede usarse:
  - en el turno propio
  - como reacción defensiva durante combate (ver `COMBAT_SYSTEM.md`)

---

## 10. Reacciones defensivas (reactive + counterattack)

- Solo el **defensor** puede usar cartas reactivas.
- En la ventana defensiva se puede jugar **máximo 1 carta total** por ataque.
- No existen reacciones del atacante dentro de esa ventana.
- Las cartas reactivas:
  - se destruyen al usarse
  - no crean estados persistentes
  - no cambian reglas del juego

### 10.1 Counterattack
- `counterattack` tiene daño base fijo (`stats.counterDamage`) y costo.
- Cada `counterattack` resuelve con doble tirada:
  - d20 del defensor (contraataque)
  - d20 del atacante (contradefensa)
- Fórmula:
  - `counterFinal = max(0, (counterDamage + d20Contraataque) - (DEF atacante + d20Contradefensa))`
- Si el d20 de contraataque es 20 natural, suma bono crítico.
- Si el d20 de contraataque es 1 natural, el contraataque hace 0 daño.
- Los contraataques se aplican en orden de juego y pueden matar al atacante.

---

## 11. Reglas explícitamente prohibidas

En el PMV **no existen**:

- Deckbuilding
- Construcción de mazos previa
- Reacciones “en cualquier momento”
- Cartas que modifiquen reglas base
- Resurrección
- Curación infinita
- Contadores ocultos
- Pila de efectos
- Estados persistentes complejos

Cualquier implementación de estos puntos es incorrecta.

---

## 12. Autoridad del documento

- Este documento tiene prioridad sobre:
  - comentarios en código
  - implementaciones previas
  - interpretaciones personales
- Cualquier cambio debe reflejarse aquí antes de tocar el código.
