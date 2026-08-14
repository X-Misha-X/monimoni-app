# MONI MON! database model

Este documento define el modelo relacional objetivo para que la app deje de depender de
`monimon_state` como fuente de verdad. La idea es que cada dato importante viva en una
tabla clara de Supabase y que el frontend consuma endpoints especificos del backend.

## Problema actual

La app todavia guarda gran parte del estado completo en `public.monimon_state.data`.
Eso funciona para prototipar, pero es fragil:

- un guardado viejo puede pisar datos nuevos;
- no se ve claramente en Supabase donde esta cada cosa;
- contactos, integrantes, gastos, pagos y prestamos quedan mezclados;
- no hay trazabilidad real para aprobaciones;
- es dificil migrar a reglas de seguridad serias.

`monimon_state` debe quedar solo como tabla legacy temporal para migrar datos viejos.
No debe seguir siendo la fuente principal de la app.

Esto explica por que un Mon! como `Brochero` puede "volver", desaparecer o no verse en
las tablas esperadas: hoy el backend sigue leyendo y escribiendo un bloque JSON completo.
Hasta que migremos ese bloque a tablas reales, Supabase no tiene una fila clara por cada
Mon!, gasto, integrante o pago.

## Estado de implementacion

Esta propuesta agrega la estructura objetivo, pero no cambia la UI todavia. El cambio
seguro es:

- primero crear las tablas;
- despues hacer un backup de `monimon_state`;
- despues correr un migrador que copie los datos existentes a las tablas nuevas;
- recien despues cambiar endpoints y frontend para que usen esas tablas.

No conviene borrar `monimon_state` hasta verificar que todos los Mon! actuales fueron
migrados correctamente.

## Conceptos principales

### Profile

`profiles` representa un usuario registrado de Supabase Auth.

Campos clave:

- `id`: mismo UUID que `auth.users.id`.
- `email`: email verificado o principal.
- `username`: handle unico visible y buscable, por ejemplo `@misha.alleycat`.
- `display_name`: apodo mostrado dentro de la app.
- `country_code`: pais o region del usuario.
- `role`: `user` o `admin`.

Decision importante: el `username` no se usa para login. El login es por email/password
o Google. El username sirve para busqueda, contactos e identidad visible.

### Member

`members` representa a una persona que puede participar en un Mon!.

Campos clave:

- `id`: identificador estable de integrante.
- `profile_id`: apunta a `profiles.id` si es usuario registrado.
- `kind`: `registered` o `guest`.
- `display_name`: nombre visible dentro de Mon!.

Regla: un usuario registrado tiene un unico `member` estable y se reutiliza en todos los
Mon!. La pertenencia a cada Mon! se decide con `monimon_members`.

### Mon!

`monimons` representa un espacio de cuentas.

Campos clave:

- `id`
- `name`
- `type`: `personal` o `group`
- `settlement_mode`: `global` o `direct`
- `default_currency`
- `owner_profile_id`

Reglas:

- Cada usuario tiene un Mon! personal creado por defecto.
- El Mon! personal puede renombrarse, pero no editar integrantes.
- En grupos se agregan integrantes por contacto o por invitacion.

### Mon! members

`monimon_members` es la tabla de pertenencia.

Campos clave:

- `monimon_id`
- `member_id`
- `role`: `owner`, `admin` o `member`
- `status`: `active`, `invited` o `removed`

Siempre que se valide un `member`, se valida tambien dentro de que `monimon` opera.

## Gastos

`expenses` guarda gastos compartidos.

Regla inicial: modo global.

En modo global:

- cada gasto se divide entre los integrantes activos participantes;
- quien pago recibe credito por lo que pago;
- cada participante tiene debito por su parte;
- el saldo de cada persona es `pagado - parte`;
- los pagos verificados ajustan ese saldo.

Ejemplo:

- Integrantes: Yo, Leku, Gor, Sepia.
- Gor pago $500.000.
- Yo pague $100.000.
- Total: $600.000.
- Parte de cada uno: $150.000.
- Yo: pague $100.000 y consumi $150.000, entonces debo $50.000.
- Gor: pago $500.000 y consumio $150.000, entonces le deben $350.000.

En modo global, la pregunta "cuanto le debo a Gor" se resuelve desde el balance global,
no desde cada gasto aislado.

## Prestamos

`loans` guarda prestamos directos.

Regla:

- no se dividen;
- una persona presta a otra;
- la deuda es el importe completo;
- no comparte logica con `expenses`.

Esto evita que un gasto compartido aparezca en la pestana Prestamos.

## Pagos y aprobaciones

`payments` guarda pagos entre integrantes.

Regla:

- al crear un pago, queda `pending`;
- no modifica balances hasta estar `verified`;
- la verificacion se maneja con `approval_requests` y `approval_responses`;
- cuando todos los involucrados aprueban, el pago pasa a `verified`.

`payment_allocations` permite que un pago se asocie a gastos especificos en el futuro,
sin romper el modo global.

## Contactos

`contact_relationships` guarda relaciones entre usuarios registrados.

Reglas:

- solo perfiles reales;
- no guarda guests;
- se busca por `profiles.email` o `profiles.username`;
- si no se encuentra, se puede copiar/enviar invitacion a la app.

Los invitados no registrados de un Mon! viven como `members.kind = guest`, no como
contactos.

## Invitaciones

`invitations` vincula un link de invitacion con:

- un Mon!;
- opcionalmente un `guest_member_id`;
- opcionalmente un email invitado;
- el perfil que acepta la invitacion.

Cuando una persona se registra y acepta un link, puede reclamar el guest member.

## Archivos

`attachments` guarda metadata de imagenes/documentos. El archivo real vive en Supabase
Storage.

Ejemplo:

- bucket: `monimon-attachments`
- storage_path: `monimons/{monimon_id}/expenses/{expense_id}/ticket.png`
- metadata en `attachments`

## Vistas calculadas

Las vistas son importantes porque evitan recalcular balances de forma inconsistente en
el frontend.

### `expense_ledger_entries`

Convierte gastos verificados en movimientos contables:

- quien pago: delta positivo;
- participantes: delta negativo por su parte.

### `payment_ledger_entries`

Convierte pagos verificados en movimientos:

- quien paga: delta positivo, porque reduce lo que debe;
- quien cobra: delta negativo, porque reduce lo que le deben.

### `monimon_member_balances`

Suma los ledgers por Mon!, integrante y moneda.

Convencion:

- `balance > 0`: a esa persona le deben.
- `balance < 0`: esa persona debe.
- `balance = 0`: esta equilibrado.

## Plan de migracion recomendado

1. Crear las tablas nuevas sin borrar `monimon_state`.
2. Congelar escrituras nuevas al JSON legacy.
3. Crear endpoints backend por recurso: profiles, contacts, monimons, expenses, loans,
   payments y approvals.
4. Migrar el contenido de `monimon_state.data` a las tablas normalizadas.
5. Cambiar el frontend para leer de los nuevos endpoints.
6. Dejar `monimon_state` en solo lectura por una version.
7. Eliminar `monimon_state` cuando confirmemos que no queda data real ahi.

## Regla de oro

Datos de negocio no van en localStorage. Como mucho localStorage puede guardar
preferencias de UI no criticas, por ejemplo la pestana abierta o un filtro visual.
