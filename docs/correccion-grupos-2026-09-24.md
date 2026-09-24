# Grupos, sesiones y sincronización — 24/09/2026

## Problema y corrección

La lectura combinaba `group_state` con tablas normalizadas obsoletas. Esto
reincorporaba integrantes eliminados y perdía los metadatos de reparto.
Además, cada cliente reemplazaba el documento completo sin comprobar su versión.

`group_state` es ahora la fuente única de lectura y escritura. Las tablas
normalizadas se conservan como datos históricos; el servidor no vuelve a
sincronizarlas ni a mezclarlas en cada lectura. Si no existe el documento, se
permite la importación inicial desde esas tablas. No requiere migración SQL.

Cada escritura usa una revisión UUID y un PATCH condicional de PostgREST sobre
`data->>_revision`; solo una escritura concurrente puede ganar. Los clientes
rebasan cambios independientes, pero detienen el guardado cuando se editó el
mismo campo. El cliente conserva el borrador hasta resolver el conflicto.
Los clientes anteriores reciben 409 y deben recargar antes de guardar.

## Comportamiento

- Vinculación atómica y limitada al grupo: un invitado puede unirse a una cuenta
  ya presente, una amistad aceptada o una solicitud aprobada. Se remapean
  movimientos y repartos, se suman cuotas duplicadas y se conserva una marca de
  baja del invitado. Las transferencias a uno mismo quedan anuladas, sin borrar
  su registro.
- El enlace pregunta si la persona corresponde a un invitado existente. Esa
  opción solicita confirmación al administrador y no agrega un duplicado.
- Configuración visible a integrantes; pueden salir sin ser administradores.
  El último administrador debe dejar otra cuenta activa a cargo.
- Campana global para amistad, invitaciones de grupo y vinculación de identidad.
- Participantes explícitos en gastos anteriores antes de modificar integrantes.
- Sesión en sessionStorage para F5 y CTRL+F5; localStorage cuando se elige
  mantenerse conectado. Renovación automática, tokens rotados y un reintento
  ante 401. Una caída de red no borra la sesión. No se almacenan contraseñas.
- Consulta de cambios cada 3 segundos en pestañas visibles y al recuperar foco
  o conexión; no es una suscripción WebSocket. Se espera al guardado antes de
  ejecutar acciones de grupo.

## Verificación

`npm test`, `python -m unittest discover -s tests -p 'test_*.py'` y
`npm run build`.

Las pruebas cubren CAS, escrituras viejas, vinculación con cuenta ya presente,
permisos de administrador, salida sin pérdida de historia, reparto exclusivo
de MISHA, datos de otros grupos, transferencias a uno mismo, invitación sin
duplicado, persistencia de sesión, refresh concurrente y recuperación segura.

Prueba UI con dos sesiones sintéticas aisladas de Supabase: amistad desde
inicio, vinculación de GOR con LUCAS ya presente, actualización del otro
cliente, recarga sin login, salida de Lucas, solicitud de vinculación desde
invitación y aprobación por MISHA. También se verificó un guardado normal de
configuración. El fixture corre exclusivamente en 127.0.0.1:8001.

## Recuperación de GORBANK

`scripts/repair_group_identity.py` prepara la reparación sin escribir por defecto.
Comprueba que cada gasto coincida por ID, título, fecha, monto y moneda con la
copia original. Restaura solamente los campos de reparto y después vincula la
identidad. `--apply` exige que la API publicada anuncie `stateProtocol: 2`, crea
copias locales en `backups/` (ignoradas por Git), guarda con CAS y verifica la
revisión resultante. Si los datos cambiaron, aborta en lugar de adivinar.

## Límite pendiente

Esta entrega protege las acciones de grupo y evita resurrecciones por autosave,
pero no completa la separación de datos por usuario documentada en la revisión
del 23/09. El endpoint global sigue entregando datos de todos los grupos a una
sesión autenticada. Se debe reemplazar por lecturas y escrituras acotadas a cada
usuario/grupo y filtrar campos privados antes de ampliar el acceso público.

No volver al servidor anterior tras reparar datos: volvería a mezclar fuentes
y a admitir escrituras sin revisión. Una reversión requiere mantener el
protocolo 2 o detener escrituras y restaurar una copia de forma controlada.
