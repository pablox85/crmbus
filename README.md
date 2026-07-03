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
3. Instalar dependencias:

```bash
npm install
```

4. Ejecutar:

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

## Bootstrap de datos

Con Supabase real, la app espera que cada usuario autenticado tenga un registro en `profiles` cuyo `id` sea el UUID de `auth.users`.

Ejemplo de bootstrap inicial:

```sql
insert into public.tenants (id, tenant_id, name)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Empresa Demo');

insert into public.profiles (id, tenant_id, display_name, email, role, active)
values (
  '{UUID_DEL_USUARIO_AUTH}',
  '00000000-0000-0000-0000-000000000001',
  'Admin Demo',
  'admin@demo.com',
  'admin',
  true
);
```

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

Todas las tablas incluyen `tenant_id`. Las consultas de la app filtran por tenant, y las policies RLS de Supabase refuerzan aislamiento por tenant y rol.

## Deploy

En Vercel, configurar `NEXT_PUBLIC_USE_DEMO_DATA=false`, `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Para aplicar el esquema Supabase:

```bash
supabase db push
```
