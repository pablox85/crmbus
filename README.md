# CRMBus

MVP SaaS multi-tenant para control de kilometraje de flotas de ómnibus.

## Stack

- Next.js App Router
- React + TypeScript estricto
- Tailwind CSS con modo oscuro
- Supabase Auth
- Supabase Postgres con Row Level Security
- Vercel

## Configuración local

1. Copiar `.env.example` a `.env.local`.
2. Para usar datos locales editables, dejar `NEXT_PUBLIC_USE_DEMO_DATA=true`.
3. Para usar Supabase real, cambiar `NEXT_PUBLIC_USE_DEMO_DATA=false`, crear un proyecto Supabase, aplicar la migración SQL y completar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Instalar dependencias:

```bash
npm install
```

5. Ejecutar:

```bash
npm run dev
```

## Modo demo/local

Con `NEXT_PUBLIC_USE_DEMO_DATA=true`, la app usa `src/demo/seed.ts` y persiste cambios en `localStorage`, sin depender de Supabase.

Usuarios demo:

```txt
admin@demo.local / admin123
supervisor@demo.local / supervisor123
chofer@demo.local / chofer123
lectura@demo.local / lectura123
```

Para resetear los datos demo al seed:

```js
window.crmbusResetDemoData()
```

Todo el modo demo vive en `src/demo/` y está marcado como removible. Para producción, usar `NEXT_PUBLIC_USE_DEMO_DATA=false`.

La auditoría real se guarda por triggers en Supabase. En modo demo, la auditoría se simula en `localStorage` para usuarios, buses, registros de km y configuración, y la invitación crea un perfil local de prueba para mantener el flujo usable sin Supabase.

## Autenticación

La app usa una doble capa:

- `proxy.ts`: seguridad server-side. En Next.js 16 se usa `proxy.ts` en lugar de `middleware.ts`. Valida la sesión con Supabase SSR y `auth.getUser()` antes de renderizar rutas protegidas, refresca cookies y aplica permisos con `canAccessPath`.
- `RequireAuth.tsx`: capa client-side de UX. Mantiene estados de loading, redirecciones suaves y evita parpadeos, pero no es la barrera de seguridad principal.

Las rutas protegidas reales son `/dashboard`, `/flota`, `/registro-km`, `/historial`, `/usuarios`, `/auditoria` y `/configuracion`. Los route groups como `app/(app)` no forman parte de la URL.

## Variables

Variables públicas:

```env
NEXT_PUBLIC_USE_DEMO_DATA=true
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_USE_DEMO_DATA` se interpreta explícitamente como boolean. Si es `true`, se conserva el modo demo/local. Si es `false`, `NEXT_PUBLIC_SUPABASE_URL` debe ser una URL válida y `NEXT_PUBLIC_SUPABASE_ANON_KEY` no puede estar vacía.

Variable server-only para verificación manual RLS:

```env
SUPABASE_SECRET_KEY=
# o legacy:
SUPABASE_SERVICE_ROLE_KEY=
```

La clave secreta nunca debe usar prefijo `NEXT_PUBLIC_`, nunca debe imprimirse y nunca debe importarse en código cliente.

## Usuarios e Invitaciones

Con Supabase real, la pantalla `Usuarios` usa el flujo principal `Invitar usuario`. El endpoint server-side crea la invitación con Supabase Auth Admin API y envía `tenant_id`, `display_name` y `role` como metadata segura.

Cuando la persona acepta la invitación, el trigger `on_auth_user_created_profile_invite` crea automáticamente su registro en `profiles`. El alta manual con UUID Auth queda disponible solo como fallback avanzado.

El endpoint de invitación requiere rol `admin` validado server-side y usa `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY`, nunca claves `NEXT_PUBLIC_`.

Roles soportados:

- `admin`: acceso total.
- `supervisor`: dashboard, flota, registro de km e historial.
- `driver`: registro de kilometraje y sus propios registros.
- `readonly`: dashboard, flota e historial.
- `demo`: acceso total para entornos demo/local.

## Modelo Supabase

Tablas:

- `tenants`
- `profiles`
- `buses`
- `km_records`
- `hour_records`
- `trips`
- `current_accounts`
- `audit_log`

Todas las tablas incluyen `tenant_id`. Las consultas de la app filtran por tenant, y las policies RLS de Supabase refuerzan aislamiento por tenant y rol.

`audit_log` registra cambios paralelos por trigger en `profiles`, `buses`, `km_records` y `current_accounts`. Es de solo lectura para `admin` y `supervisor`, siempre filtrado por tenant.

## Versiones Críticas

`next`, `react` y `react-dom` están fijadas a versiones exactas en `package.json` porque son versiones mayores/recientes. Actualizarlas debe ser una decisión explícita y probada, no automática por rangos semver abiertos.

## Verificación RLS

El comando manual:

```bash
ALLOW_RLS_VERIFICATION=true npm run verify:rls
```

Requiere `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SECRET_KEY` o `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.

Este script escribe datos reales en el único proyecto Supabase, crea usuarios Auth temporales, ejecuta verificaciones con JWTs reales de usuarios de prueba y limpia los datos en `try/finally`. No se ejecuta en CI, build, lint ni hooks, y no debe correrse automáticamente ni durante picos de uso.

Si la limpieza informa un error, el script muestra los IDs creados. Eliminarlos manualmente en este orden: `current_accounts`, `trips`, `hour_records`, `km_records`, `buses`, `profiles`, `audit_log`, `tenants` y finalmente usuarios Auth.

## Deploy

En Vercel, configurar `NEXT_PUBLIC_USE_DEMO_DATA=false`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Para aplicar el esquema Supabase:

```bash
supabase db push
```
