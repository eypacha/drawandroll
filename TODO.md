# TODO del proyecto (estado actual)

Actualizado: 2026-02-09

## Implementado

### Flujo base de partida
- [x] Sesion peer-to-peer host/guest y sincronizacion de mensajes de juego.
- [x] Inicializacion de partida con mazo compartido (`batch.json`) y shuffle.
- [x] Reparto inicial de 7 cartas por jugador.
- [x] Turnos y fases base: `draw -> recruit -> combat -> end`.
- [x] Regla de primer turno: el jugador inicial salta combate en turno 1.

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
- [x] Resolucion de combate sincronizada por host.
- [x] Cada heroe ataca maximo 1 vez por fase de combate.
- [x] Eliminacion de heroes al llegar a 0 HP.

### UX/pulido ya aplicado
- [x] Highlight de drop solo en slot activo al hacer hover durante drag.
- [x] Eliminado el efecto de elevar el slot al arrastrar para drop.
- [x] Reinicio de partida con request/accept entre jugadores.

## Falta por implementar (gap vs docs de reglas)

### Reglas de victoria/derrota
- [x] Condicion de derrota al final de turno: si el jugador activo queda sin heroes, pierde.
- [x] Cierre formal de partida (`phase = ended`, `winner`) y bloqueo de acciones.

### Tipos de carta no jugables aun
- [x] Jugar cartas `healing` desde mano.
- [x] Jugar cartas `reactive` en ventana defensiva.
- [x] Jugar cartas `counterattack` en ventana defensiva.
- [x] Ventana multi-carta del defensor durante combate (seleccion manual y pasar).

### Sistema de combate incompleto
- [ ] Critico natural 20 y fallo critico natural 1 segun regla cerrada.
- [ ] Aplicar consumo/reduccion de durabilidad de items por uso.
- [ ] Destruir item al llegar a durabilidad 0.

### Recursos y consistencia
- [ ] Definir y cerrar regla de costo para `healing` y `reactive` (recurso + timing).
- [ ] Revisar consistencia `MAX_RESOURCES` y cualquier limite de mano/robo con reglas de producto.

### Simulacion/CI de balance
- [ ] Bot baseline para simulaciones automatas.
- [ ] Corridas de 50-100 partidas y metricas agregadas.
- [ ] Alertas de regresion de ritmo/balance en CI.

## Backlog sugerido (orden)
1. Implementar condicion de derrota y cierre de partida.
2. Implementar healing/reactions con ventana unica defensiva.
3. Ajustar reglas finas de combate (d20, criticos, durabilidad).
4. Agregar tests de flujo completo (turno, combate, derrota).
5. Montar simulaciones de balance en CI.
