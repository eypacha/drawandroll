# CARD_TEMPLATES.md

Este documento define **las plantillas (templates) procedurales**
a partir de las cuales se generan todas las cartas del juego.

Las plantillas:
- NO son cartas jugables
- NO tienen nombre ni arte
- Definen roles, rangos y restricciones duras

Toda carta generada debe ser una **instancia válida de una plantilla**.

---

## 1. Principios generales

- Cada carta pertenece a **una sola plantilla**
- Las plantillas definen:
  - rol
  - rangos numéricos
  - restricciones (“never rules”)
- El generador:
  - puede variar números dentro de rangos
  - NO puede violar restricciones
- El balance vive en las plantillas, no en cartas individuales

---

## 2. Plantillas de HÉROES

Todos los héroes tienen:
- ATK
- DEF
- HP
- Costo base de reclutamiento

El costo final de reclutamiento se deriva del costo base definido por la plantilla.
(`GAME_RULES.md`).

---

### 2.1 Hero Template: **Balanced Fighter**

Rol:
- Héroe versátil sin extremos.

Rangos:
- ATK: 2–3
- DEF: 11–13
- HP: 6–8
- Costo base: 3

Never:
- ATK > 3
- HP > 8
- DEF < 11

---

### 2.2 Hero Template: **Glass Cannon**

Rol:
- Alto daño, alta fragilidad.

Rangos:
- ATK: 3–4
- DEF: 10–11
- HP: 4–5
- Costo base: 3

Never:
- HP > 5
- DEF > 11
- ATK < 3

---

### 2.3 Hero Template: **Tank**

Rol:
- Absorber daño y proteger mesa.

Rangos:
- ATK: 1–2
- DEF: 13–15
- HP: 8–10
- Costo base: 4

Never:
- ATK > 2
- DEF < 13
- HP < 8

---

### 2.4 Hero Template: **Skirmisher**

Rol:
- Presión temprana, eficiencia media.

Rangos:
- ATK: 2–3
- DEF: 11–12
- HP: 5–6
- Costo base: 2

Never:
- HP > 6
- DEF > 12

---

### 2.5 Hero Template: **Fragile Support**

Rol:
- Bajo impacto directo, utilidad situacional.

Rangos:
- ATK: 1–2
- DEF: 10–11
- HP: 4–5
- Costo base: 2

Never:
- ATK > 2
- HP > 5

---

## 3. Plantillas de ÍTEMS / ARMAS

Todos los ítems:
- modifican stats
- ocupan slots
- tienen durabilidad
- se destruyen al llegar a 0 durabilidad

---

### 3.1 Item Template: **Offensive Weapon**

Rol:
- Aumentar daño a costo de fragilidad.

Rangos:
- ATK bonus: +1 a +2
- DEF modifier: 0 o −1
- Durabilidad: 1–2
- Costo: 2

Never:
- ATK bonus > +2
- Durabilidad > 2

---

### 3.2 Item Template: **Defensive Gear**

Rol:
- Aumentar supervivencia.

Rangos:
- DEF bonus: +1 a +2
- ATK modifier: 0 o −1
- Durabilidad: 2–3
- Costo: 2

Never:
- DEF bonus > +2
- Durabilidad < 2

---

### 3.3 Item Template: **High Risk / High Reward**

Rol:
- Trade-off agresivo.

Rangos:
- ATK bonus: +2 a +3
- DEF modifier: −1 a −2
- Durabilidad: 1
- Costo: 3

Never:
- DEF penalty < −2
- Durabilidad > 1

---

## 4. Plantillas de CARTAS REACTIVAS DEFENSIVAS

Todas las cartas reactivas:
- solo pueden jugarse por el defensor
- solo en la ventana de reacción
- se destruyen al usarse

---

### 4.1 Reactive Template: **Damage Mitigation**

Rol:
- Reducir impacto de un ataque.

Efectos posibles:
- Reducir daño en 1–2

Costo:
- 1–2 recursos

Never:
- Reducir más de 2 daño
- Cancelar ataque completo

---

### 4.2 Reactive Template: **Critical Control**

Rol:
- Manipular críticos.

Efectos posibles:
- Cancelar crítico
- Convertir crítico en impacto normal

Costo:
- 2 recursos

Never:
- Convertir fallo en impacto
- Crear crítico

---

### 4.3 Reactive Template: **Survival Trick**

Rol:
- Evitar muerte inmediata.

Efectos posibles:
- El héroe no puede bajar de 1 HP este ataque

Costo:
- 3 recursos

Never:
- Curar
- Revivir
- Crear estados persistentes

---

## 5. Plantillas de CURACIÓN

La curación:
- es consumible
- no revive héroes
- puede usarse como reactivo defensivo

---

### 5.1 Healing Template: **Minor Heal**

Rol:
- Extender vida de un héroe.

Rangos:
- Curar: 1–2 HP
- Costo: 1 recurso

Never:
- Curar más de 2 HP
- Curar héroes muertos

---

### 5.2 Healing Template: **Emergency Heal**

Rol:
- Salvataje puntual.

---

## 6. Plantillas de CONTRAATAQUE

Las cartas de contraataque:
- solo se juegan en ventana defensiva
- tienen daño fijo bajo (`counterDamage`)
- consumen recursos
- se destruyen al usarse

### 6.1 Counterattack Template: **Quick Riposte**

Rol:
- respuesta barata de daño mínimo.

Rangos:
- `counterDamage`: 1
- Costo: 1

Never:
- `counterDamage` > 1

### 6.2 Counterattack Template: **Guarded Strike**

Rol:
- respuesta media con daño bajo.

Rangos:
- `counterDamage`: 1–2
- Costo: 2

Never:
- `counterDamage` > 2

Rangos:
- Curar: 2–3 HP
- Costo: 2 recursos

Never:
- Curar más de 3 HP
- Evitar muerte automáticamente

---

## 6. Restricciones globales

- Ninguna plantilla puede:
  - modificar reglas base
  - crear estados persistentes complejos
  - interactuar con el mazo
  - afectar más de un ataque
- No existen efectos “en cualquier momento”.
- Todo efecto debe resolverse inmediatamente.

---

## 7. Autoridad del documento

- Este documento define el espacio de diseño permitido.
- El generador **debe** respetar estas plantillas.
- Cualquier carta generada fuera de estos rangos es inválida.
