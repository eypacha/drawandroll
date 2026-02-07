# COMBAT_SYSTEM.md

Este documento define **el sistema de combate y su timing exacto**.  
No existen interpretaciones alternativas ni ventanas implícitas.

---

## 1. Principios del combate

- El combate es **determinista + azar controlado**.
- El evento central del combate es una **tirada de 1d20**.
- **Solo el atacante tira dados**.
- El defensor **nunca tira dados**.
- El combate se resuelve ataque por ataque, nunca en bloque.

---

## 2. Quién puede atacar

- Cada héroe puede realizar **como máximo 1 ataque por turno**.
- Un ataque siempre es:
  - de un héroe atacante
  - contra un héroe defensor
- No existen ataques a jugador directamente.
- No existen ataques simultáneos.

---

## 3. Secuencia exacta de un ataque

Un ataque **siempre** sigue este orden y no puede alterarse.

---

### 1️⃣ Declaración de ataque
- El jugador atacante elige:
  - héroe atacante
  - héroe objetivo
- No se pueden jugar cartas en este paso.
- No se aplican efectos.

---

### 2️⃣ Tirada
- El atacante tira **1d20**.
- El resultado es **visible para ambos jugadores**.
- No se pueden jugar cartas en este paso.

---

### 3️⃣ Modificadores pasivos
- Se aplican automáticamente:
  - ATK del héroe atacante
  - DEF del héroe defensor
  - modificadores de ítems visibles
- No se pueden jugar cartas en este paso.
- No existen modificadores ocultos.

---

### 4️⃣ Ventana de reacción (ÚNICA)
- **Solo el defensor** puede reaccionar.
- Puede jugar **como máximo 1 carta reactiva o curación**.
- La tirada **ya es conocida**.
- Si el defensor no reacciona en este momento:
  - pierde la oportunidad
- No existen reacciones del atacante.
- No existen contra-reacciones.

---

### 5️⃣ Resolución del ataque
- Se calcula el resultado final del ataque.
- Se determina si el ataque impacta o falla.
- Si impacta:
  - se calcula daño
  - se aplica daño inmediatamente
- Si el HP del héroe defensor llega a **0**:
  - el héroe muere
  - sale del juego
- No se pueden jugar cartas en este paso.

---

### 6️⃣ Cierre del ataque
- Se descuenta durabilidad de los ítems usados.
- El ataque termina definitivamente.
- No se pueden aplicar efectos posteriores.

---

## 4. Impacto y daño

- Un ataque impacta si:
  - `d20 + ATK ≥ DEF`
- El daño infligido es:
  - definido por la plantilla del héroe o arma
- El daño:
  - reduce HP
  - **persiste entre turnos**
- No existe mitigación automática fuera de reactivos.

---

## 5. Críticos y fallos críticos

### 5.1 Crítico
- **20 natural** es siempre un crítico.
- Un crítico:
  - impacta automáticamente
  - aplica daño aumentado (definido por plantilla)
- Los críticos **pueden ser cancelados o mitigados** por reactivos defensivos.

---

### 5.2 Fallo crítico
- **1 natural** es siempre un fallo crítico.
- Un fallo crítico:
  - no impacta
  - no inflige daño
- No existen efectos adicionales por fallo crítico en el PMV.

---

## 6. Cartas reactivas en combate

- Solo pueden jugarse en la **ventana de reacción**.
- Solo el defensor puede jugarlas.
- Máximo **1 reactivo por ataque**.
- Ejemplos válidos de efectos:
  - reducir daño
  - cancelar crítico
  - redirigir ataque
  - proteger o romper un ítem
  - evitar la muerte este turno
- Las cartas reactivas:
  - se destruyen al usarse
  - no crean estados persistentes
  - no modifican reglas base

---

## 7. Curación durante combate

- La curación:
  - puede usarse como reactivo defensivo
  - solo cura héroes vivos
- La curación:
  - no revive héroes
- Si la curación evita que el HP llegue a 0:
  - el héroe sobrevive
- Si el HP llega a 0:
  - la muerte es definitiva

---

## 8. Reglas explícitamente prohibidas en combate

No existen en el PMV:

- Pila de efectos
- Reacciones fuera de la ventana definida
- Reacciones del atacante
- Rerolls
- Modificadores ocultos
- Ataques en cadena
- Estados persistentes complejos
- Daño diferido
- “Antes de morir…”

Cualquier implementación de estos puntos es incorrecta.

---

## 9. Autoridad del documento

- Este documento tiene prioridad sobre:
  - comentarios en código
  - interpretaciones implícitas
- Si hay conflicto entre implementación y este documento:
  - la implementación es incorrecta
