# Migración a tablas normalizadas

Objetivo: dejar de usar `public.monimon_state.data` como fuente real de datos y pasar a tablas claras en Supabase.

## Flujo seguro

1. Crear backup del estado legacy:

   ```bash
   python scripts/backup_state.py
   ```

   Esto crea un archivo en `backups/`. Esa carpeta está ignorada por Git porque puede contener datos reales.

2. Ejecutar la migración SQL en Supabase:

   Abrir Supabase > SQL Editor > pegar `supabase/migrations/001_core_schema.sql` > Run.

3. Generar una vista previa sin escribir datos:

   ```bash
   python scripts/migrate_state_to_supabase.py --dry-run
   ```

   El script crea `backups/normalized_preview_*.json` con las filas que insertaría.

4. Revisar el resumen y advertencias.

5. Aplicar la migración:

   ```bash
   python scripts/migrate_state_to_supabase.py --apply
   ```

## Rollback

Esta migración es aditiva: no borra `monimon_state`.

Si algo sale mal, la app puede seguir leyendo el estado viejo mientras corregimos las tablas nuevas. El backup en `backups/` permite recuperar exactamente el JSON anterior.

## Punto importante

Hasta que cambiemos el backend para leer y escribir las tablas nuevas, la app sigue usando el endpoint legacy `/api/state`. Este paso solo prepara la base y migra datos.
