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

### 3️⃣ Reclutamiento
- El jugador puede jugar cartas de **héroe** pagando su costo.
- No puede superar el límite de 3 héroes en mesa.

### 4️⃣ Equipamiento
- El jugador puede equipar ítems a héroes.
- Cada héroe tiene slots limitados (definido por plantilla).
- Los ítems modifican stats de forma inmediata.

### 5️⃣ Combate
- El jugador puede declarar ataques con sus héroes.
- El sistema de combate se define en `COMBAT_SYSTEM.md`.

### 6️⃣ Fin de turno
- Se verifica la condición de derrota:
  - si el jugador activo termina el turno sin héroes → pierde.

---

## 8. Sistema de presión por pérdidas

Este sistema es **obligatorio** y no puede omitirse.

- Cada vez que un jugador pierde un héroe:
  - el **costo de reclutar héroes** para ese jugador aumenta.

Escalado:
- 1er héroe perdido → +1 costo
- 2do héroe perdido → +2 costo
- 3ro héroe perdido → +3 costo
- etc.

Características:
- El castigo es **personal**, no global.
- No se reduce durante la partida.
- No se resetea por tiempo ni por robo.
- No se resetea salvo que la partida termine.

---

## 9. Ítems / Armas

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

## 10. Curación

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

## 11. Cartas reactivas defensivas

- Solo el **defensor** puede usar cartas reactivas.
- Máximo **1 carta reactiva por ataque**.
- No existen reacciones del atacante.
- No existen cadenas de reacciones.
- Las cartas reactivas:
  - se destruyen al usarse
  - no crean estados persistentes
  - no cambian reglas del juego

---

## 12. Reglas explícitamente prohibidas

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

## 13. Autoridad del documento

- Este documento tiene prioridad sobre:
  - comentarios en código
  - implementaciones previas
  - interpretaciones personales
- Cualquier cambio debe reflejarse aquí antes de tocar el código.
