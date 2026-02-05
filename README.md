# Tactical Card Combat – PMV

Juego táctico por turnos basado en cartas, combate con d20 y muerte permanente.  
Diseñado **software-first**, con generación procedural controlada y foco en partidas cortas, tensas y repetibles.

Este repositorio implementa un **PMV (Producto Mínimo Viable)**.  
No es un TCG, no es MTG-like, no es un deckbuilder.

---

## Stack tecnológico

- **Framework**: Vue 3
- **Estilos**: Tailwind CSS
- **Estado**: simple y explícito (sin overengineering)
- **Objetivo técnico**: PMV pulido con optimización, arquitectura limpia y experiencia de usuario refinada

---

## Visión del juego

- 2 jugadores
- Un único mazo compartido
- Combate táctico con **1d20**
- **Muerte permanente** de héroes
- Presión creciente por pérdidas
- Partidas de **10–15 minutos**
- El éxito es que alguien diga:
  > “Anoche jugué 3 partidas con un amigo”

---

## Qué es este juego

- Un sistema de **decisiones bajo presión**
- Un generador de situaciones memorables
- Un juego donde el azar importa, pero **no decide solo**
- Un diseño pensado para crecer por iteración, no por promesas

---

## Qué NO es este juego

Este PMV **no** incluye ni persigue:

- Deckbuilding
- Construcción de mazos previa
- IA generativa en runtime
- Uso de LLMs durante la partida
- Lore complejo
- Metajuego o progresión persistente
- Balance perfecto o competitivo
- Sets comerciales o monetización

Cualquier intento de agregar esto **está fuera de alcance**.

---

## Alcance del PMV

El PMV debe permitir:

- Jugar partidas completas de principio a fin
- Entender reglas sin ambigüedad
- Repetir partidas en la misma sesión
- Ajustar números y probabilidades rápidamente

El PMV **prioriza**:
- pulido estético
- UX fluida
- rendimiento optimizado
- código mantenible

El PMV **no necesita**:
- gran variedad de cartas
- sonido
- animaciones excesivamente complejas

---

## Filosofía de diseño

- **Reglas claras > excepciones**
- **Números > texto**
- **Una sola ventana de reacción**
- **Estados visibles**
- **Nada de “en cualquier momento”**
- **La presión cierra la partida, no el reloj**

El diseño prioriza:
- ritmo
- tensión
- legibilidad
- decisiones incómodas

---

## Calidad y pulido

Este PMV se enfoca en **calidad de ejecución**:

- **Optimización de rendimiento**: código eficiente, renderizado optimizado, gestión de estado ligera
- **Pulido estético y UX**: interfaz refinada, transiciones fluidas, feedback visual claro
- **Código limpio y mantenible**: arquitectura clara, patrones consistentes, documentación adecuada
- **Experiencia profesional**: el juego debe sentirse completo y pulido, no como un prototipo

Aunque es un PMV en alcance, la **calidad de ejecución es prioritaria**.

---

## Generación procedural (visión)

- Las cartas no se generan una por una al robar.
- Se generan **lotes (batches)** de tamaño fijo (ej. 50 cartas).
- Cada lote es un snapshot balanceado del sistema.
- Los lotes pueden congelarse en el futuro como sets fijos.

En el PMV:
- la generación es simple
- controlada
- sin IA pesada

---

## Criterio de éxito

Este proyecto se considera exitoso si:

- alguien juega más de una partida seguida
- las partidas terminan sin estancarse
- se recuerdan jugadas o situaciones concretas
- el desarrollador tiene ganas de seguir iterando

Nada más.

---

## Documentación del repositorio

Este README define **la intención**.  
Las reglas y contratos viven en documentos separados:

- `GAME_RULES.md` – reglas cerradas del juego
- `COMBAT_SYSTEM.md` – combate y ventanas
- `CARD_TEMPLATES.md` – plantillas procedurales
- `BATCH_GENERATION.md` – generación de lotes
- `NON_GOALS.md` – cosas que no deben implementarse

El código **debe seguir estos documentos**, no reinterpretarlos.

---

## Nota final

Este proyecto está diseñado para **probar una idea**, no para demostrar completitud.  
Si el juego gusta, crecerá.  
Si no, habrá valido la pena igual.
