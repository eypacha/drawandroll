# TODO del proyecto (estado actual)

Actualizado: 2026-02-09

## Implementado

### Flujo base de partida
- [x] Sesion peer-to-peer host/guest y sincronizacion de mensajes de juego.
- [x] Inicializacion de partida con mazo compartido (`batch.json`) y shuffle.
- [x] Reparto inicial de 7 cartas por jugador.
- [x] Turnos y fases base: `draw -> recruit -> combat -> discard -> end`.
- [x] Regla de primer turno: el jugador inicial salta combate en turno 1.
- [x] Mulligan inicial cuando la mano no tiene heroes (revela, devuelve y roba nuevamente).

### Mano y mesa
- [x] Drag and drop de cartas de mano para jugar en slots.
- [x] Reclutar heroes en slots vacios.
- [x] Equipar items sobre heroes propios.
- [x] Limite de 3 heroes en mesa.
- [x] Limite de 3 items por heroe.
- [x] Costo de reclutamiento con presion (heroes perdidos).
- [x] Visualizacion de hero + stack de items por slot.

### Recursos y combate
- [x] Refresh de recursos al inicio de turno del jugador activo.
- [x] Seleccion de atacante y objetivo en fase de combate.
- [x] Resolucion de combate sincronizada por host (host-authoritative).
- [x] Secuencia de dados en panel lateral (sin popup): atacante -> defensor.
- [x] Ventana de reaccion defensiva integrada al flujo de combate.
- [x] Cada heroe ataca maximo 1 vez por fase de combate.
- [x] Eliminacion de heroes al llegar a 0 HP.
- [x] Critico natural 20 y fallo natural 1.
- [x] `counterattack` implementado (maximo 1 carta defensiva por ataque).
- [x] `healing` implementado en `recruit` y como reaccion defensiva con target.

### UX/pulido ya aplicado
- [x] Highlight de drop solo en slot activo al hacer hover durante drag.
- [x] Eliminado el efecto de elevar el slot al arrastrar para drop.
- [x] Reinicio de partida con request/accept entre jugadores.
- [x] Overlay de fin de partida + bloqueo de acciones al finalizar.

## Falta por implementar (gap vs docs de reglas)

### Reglas de victoria/derrota
- [x] Condicion de derrota al final de turno: si el jugador activo queda sin heroes, pierde.
- [x] Cierre formal de partida (`phase = ended`, `winner`) y bloqueo de acciones.

### Reglas/mecanicas pendientes (reales)
- [ ] Resolver la pequena ventaja del segundo jugador (~51.7% no-starter).

### Tests y calidad
- [ ] Agregar tests automatizados de reglas clave (combate, derrota, reacciones, healing).
- [ ] Integrar simulaciones de balance en CI con umbrales de regresion.

## Backlog sugerido (orden)
1. Ajustar balance para acercarse a 10 turnos promedio sin romper winrate.
2. Agregar tests de flujo completo (turno, combate, derrota, reacciones).
3. Montar simulaciones de balance en CI.
