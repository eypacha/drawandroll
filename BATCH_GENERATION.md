# BATCH_GENERATION.md

Este documento define **cómo se generan las cartas del juego** mediante
**lotes (batches)** procedurales.

El sistema de generación **no crea cartas al robar**.  
Todas las cartas que se usan en una partida pertenecen a un lote generado previamente.

---

## 1. Definición de lote (batch)

Un **lote** es un conjunto finito de cartas generadas proceduralmente
antes de comenzar una o varias partidas.

- Tamaño estándar del lote: **50 cartas**
- Un lote:
  - se genera de una sola vez
  - permanece fijo durante las partidas que lo usan
  - no cambia durante una partida
- El mazo de la partida se construye **exclusivamente** a partir del lote activo.

El lote es un **snapshot balanceado** del sistema procedural.

---

## 2. Objetivos del sistema de lotes

El sistema de generación por lotes existe para:

- Reducir varianza extrema por carta individual
- Mejorar percepción de justicia
- Evitar repetición visible de cartas en 2–3 partidas
- Permitir balance y testeo controlado
- Separar generación procedural de runtime de combate

---

## 3. Distribución por tipo de carta

Cada lote debe respetar una distribución aproximada por tipo.

Distribución recomendada (ajustable en código):

- **Héroes**: ~25%
- **Ítems / Armas**: ~30%
- **Cartas reactivas defensivas**: ~15%
- **Curación**: ~10%
- **Contraataques**: ~20%

La implementación:
- puede variar levemente estas proporciones
- no puede violarlas de forma extrema

Ejemplo prohibido:
- lote sin curación
- lote con solo héroes
- lote dominado por un único tipo

---

## 4. Generación basada en plantillas

Las cartas **no se generan desde cero**.

Proceso obligatorio:
1. Elegir tipo de carta según distribución
2. Elegir una **plantilla** válida (`CARD_TEMPLATES.md`)
3. Generar stats dentro de los rangos de la plantilla
4. Validar restricciones (“never rules”)
5. Crear una instancia única de carta

El generador **no puede**:
- cruzar rangos entre plantillas
- generar combinaciones fuera de rol
- inventar efectos no definidos

---

## 5. Anti-repetición dentro del lote

El sistema debe evitar repeticiones evidentes dentro de un mismo lote.

Reglas mínimas:
- Penalizar repetir:
  - misma plantilla
  - mismos rangos extremos
  - combinaciones idénticas de stats
- No pueden existir dos cartas **idénticas** dentro del mismo lote.

La anti-repetición:
- no necesita ser perfecta
- debe ser suficiente para que el lote se sienta variado

---

## 6. Identidad del lote

Cada lote puede tener:
- ligeros sesgos emergentes
  - más ofensivo
  - más defensivo
  - más reactivo
- **pero nunca extremos**

El sistema:
- **no debe forzar perfiles**
- **no debe etiquetar lotes**
- **no debe anunciar sesgos al jugador**

La identidad del lote es **emergente**, no explícita.

---

## 7. Validación del lote

Antes de aceptar un lote como válido, el sistema debe verificar:

- Tamaño correcto (50 cartas)
- Distribución razonable por tipo
- Al menos:
  - X héroes
  - Y reactivos
  - Z curaciones  
  (valores mínimos definidos en código)
- Ausencia de outliers extremos no deseados
- No duplicados exactos

Un lote inválido debe:
- descartarse
- regenerarse completamente

---

## 8. Uso del lote en partida

- Al iniciar una partida:
  - se selecciona un lote
  - se construye el mazo a partir de ese lote
- El mazo:
  - se baraja
  - se roba normalmente durante la partida
- Las cartas jugadas:
  - se descartan
  - no vuelven al mazo durante esa partida

El lote **no se modifica** durante la partida.

---

## 9. Congelación de lotes (futuro)

Un lote puede ser:
- guardado
- versionado
- convertido en un set fijo

Esto permite:
- crear “sets oficiales”
- reutilizar lotes exitosos
- crecer el pool manualmente

La congelación **no forma parte del PMV**, pero el diseño debe permitirla.

---

## 10. Reglas explícitamente prohibidas

En el PMV **no está permitido**:

- Generar cartas al momento de robar
- Usar LLMs en runtime
- Ajustar stats durante la partida
- Rebalancear un lote en caliente
- Mezclar cartas de distintos lotes
- Persistencia entre partidas

Cualquier implementación de estos puntos es incorrecta.

---

## 11. Autoridad del documento

- Este documento define el comportamiento correcto del generador.
- Si el código genera cartas fuera de estas reglas:
  - el código es incorrecto.
