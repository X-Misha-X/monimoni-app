# MONI MON! staging deploy

## Objetivo

Staging usa:

- Frontend React/Vite en Vercel.
- Backend Python en Render Free.
- Supabase como base de datos.

## 1. Backend en Render

Crear un Blueprint desde `render.yaml` o un Web Service manual con:

- Runtime: Python
- Build command: vacío
- Start command: `python server.py`
- Health check path: `/api/health`
- Plan: Free para staging

Variables de entorno en Render:

- `HOST=0.0.0.0`
- `PORT` lo define Render automáticamente.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MONIMONI_STATE_KEY=staging`
- `MONIMONI_ADMIN_EMAILS`

Cuando Render termine, copiar la URL pública del backend, por ejemplo:

```text
https://monimon-api-staging.onrender.com
```

## 2. Frontend en Vercel

Crear proyecto Vercel desde el repo.

Settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Variables de entorno en Vercel para Preview/Staging:

- `VITE_API_URL=https://monimon-api-staging.onrender.com`

No cargar claves secretas de Supabase en Vercel con prefijo `VITE_`.

## 3. Flujo de prueba

1. Abrir la URL Preview/Staging de Vercel.
2. Si Render Free está dormido, la app muestra la pantalla de despertar.
3. Login.
4. Crear gasto.
5. Registrar pago.
6. Refrescar navegador.
7. Verificar que el pago siga en historial y que la deuda se actualice.

## 4. Producción futura

Para producción se puede mantener la misma arquitectura y pasar Render a un plan pago para evitar sleeping.
