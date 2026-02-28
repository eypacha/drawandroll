# BATCH_GENERATION.md

Contrato operativo del generador de lotes (`scripts/generate-batch.js`).

---

## 1. Tamaño y distribución

- Tamaño de lote: `50` cartas.
- Distribución objetivo:
  - hero: 25%
  - item: 18%
  - weapon: 12%
  - reactive: 15%
  - healing: 10%
  - counterattack: 20%
- Se redondea por tipo y se corrige el desvío en la categoría más grande.

---

## 2. Pipeline de generación

Por cada tipo:

1. Elegir template aleatorio de ese tipo.
2. Generar stats aleatorios dentro de rangos del template.
3. Calcular costo derivado por poder + baseCost.
4. Emitir carta con `id` único.

Notas de esquema vigentes:

- Héroes incluyen `atk`, `dex`, `def`, `hp`, `damageDieSides`.
- Ítems incluyen modificadores de `atk/dex/def` (no modifican `damageDieSides`).
- Armas incluyen modificadores de `atk/dex/def` y `damageDieSides`.
- El impacto en combate se tira siempre con `1d20`; `damageDieSides` afecta solo daño (`1d4`/`1d6`).

---

## 3. Duplicados

- Se evita duplicar combinación exacta `template + stats` por tipo cuando es posible.
- Si el lote pide más cartas que combinaciones únicas disponibles para ese tipo, se permiten duplicados de stats.
- Siempre se exige `id` único por carta.

---

## 4. Validación actual

Validaciones activas:

- Tamaño total correcto (`50`).
- Mínimos por tipo (`MIN_CARDS` en código).
- IDs únicos.
- Brecha promedio `ATK` vs `DEF` de héroes bajo umbral (`HERO_ATK_DEF_AVG_MAX_GAP`).
- Dados de daño normalizados a `2`, `4` o `6` caras.

No se valida actualmente ausencia absoluta de duplicados de stats.

---

## 5. Uso en partida

- Se construye el mazo de partida desde un lote ya generado.
- El mazo se baraja.
- Las cartas jugadas van al descarte.
- No hay regeneración dinámica de cartas durante la partida.

---

## 6. Comando

Generar lote:

`node scripts/generate-batch.js`

Salida por defecto:

`data/batches/batch.json`
