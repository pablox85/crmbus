create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'supervisor', 'driver', 'readonly', 'demo');
  end if;

  if not exists (select 1 from pg_type where typname = 'bus_status') then
    create type public.bus_status as enum ('active', 'maintenance', 'inactive');
  end if;
end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default gen_random_uuid(),
  name text not null,
  rut text,
  address text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_tenant_id_unique unique (tenant_id)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  display_name text not null,
  email text not null,
  role public.app_role not null default 'driver',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  internal_number text not null,
  plate text not null,
  brand text,
  model text,
  year integer,
  current_km integer not null default 0,
  status public.bus_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, internal_number),
  unique (tenant_id, plate)
);

create table if not exists public.km_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  bus_id uuid not null references public.buses(id) on delete restrict,
  bus_label text not null,
  driver_id uuid not null references public.profiles(id) on delete restrict,
  driver_name text not null,
  record_date timestamptz not null,
  start_km integer not null,
  end_km integer not null,
  total_km integer generated always as (end_km - start_km) stored,
  route text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint km_records_valid_km check (end_km >= start_km)
);

create table if not exists public.hour_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  bus_id uuid references public.buses(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  record_date timestamptz not null default now(),
  start_hours numeric(12, 2),
  end_hours numeric(12, 2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  bus_id uuid references public.buses(id) on delete set null,
  driver_id uuid references public.profiles(id) on delete set null,
  origin text,
  destination text,
  scheduled_at timestamptz,
  status text not null default 'planned',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.current_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  account_name text not null,
  account_type text not null default 'customer',
  balance numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists buses_set_updated_at on public.buses;
create trigger buses_set_updated_at before update on public.buses
for each row execute function public.set_updated_at();

drop trigger if exists km_records_set_updated_at on public.km_records;
create trigger km_records_set_updated_at before update on public.km_records
for each row execute function public.set_updated_at();

drop trigger if exists hour_records_set_updated_at on public.hour_records;
create trigger hour_records_set_updated_at before update on public.hour_records
for each row execute function public.set_updated_at();

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at before update on public.trips
for each row execute function public.set_updated_at();

drop trigger if exists current_accounts_set_updated_at on public.current_accounts;
create trigger current_accounts_set_updated_at before update on public.current_accounts
for each row execute function public.set_updated_at();

create or replace function public.current_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.profiles
  where id = auth.uid()
    and active = true
  limit 1
$$;

create or replace function public.current_tenant_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select tenant_id from public.current_profile()
$$;

create or replace function public.current_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.current_profile()
$$;

create or replace function public.is_admin_like()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() in ('admin', 'demo')
$$;

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.buses enable row level security;
alter table public.km_records enable row level security;
alter table public.hour_records enable row level security;
alter table public.trips enable row level security;
alter table public.current_accounts enable row level security;

drop policy if exists tenants_select_own on public.tenants;
create policy tenants_select_own on public.tenants
for select using (id = public.current_tenant_id());

drop policy if exists tenants_update_admin on public.tenants;
create policy tenants_update_admin on public.tenants
for update using (id = public.current_tenant_id() and public.is_admin_like())
with check (id = public.current_tenant_id());

drop policy if exists profiles_select_own_tenant on public.profiles;
create policy profiles_select_own_tenant on public.profiles
for select using (tenant_id = public.current_tenant_id());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
for insert with check (tenant_id = public.current_tenant_id() and public.is_admin_like());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
for update using (tenant_id = public.current_tenant_id() and public.is_admin_like())
with check (tenant_id = public.current_tenant_id());

drop policy if exists buses_select_own_tenant on public.buses;
create policy buses_select_own_tenant on public.buses
for select using (
  tenant_id = public.current_tenant_id()
  and public.current_role() in ('admin', 'supervisor', 'driver', 'readonly', 'demo')
);

drop policy if exists buses_insert_admin on public.buses;
create policy buses_insert_admin on public.buses
for insert with check (tenant_id = public.current_tenant_id() and public.is_admin_like());

drop policy if exists buses_update_authorized on public.buses;
create policy buses_update_authorized on public.buses
for update using (
  tenant_id = public.current_tenant_id()
  and public.current_role() in ('admin', 'supervisor', 'driver', 'demo')
)
with check (tenant_id = public.current_tenant_id());

drop policy if exists km_records_select_own_tenant on public.km_records;
create policy km_records_select_own_tenant on public.km_records
for select using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_role() in ('admin', 'supervisor', 'readonly', 'demo')
    or (public.current_role() = 'driver' and driver_id = auth.uid())
  )
);

drop policy if exists km_records_insert_authorized on public.km_records;
create policy km_records_insert_authorized on public.km_records
for insert with check (
  tenant_id = public.current_tenant_id()
  and driver_id = auth.uid()
  and public.current_role() in ('admin', 'supervisor', 'driver', 'demo')
);

drop policy if exists hour_records_all_own_tenant on public.hour_records;
create policy hour_records_all_own_tenant on public.hour_records
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists trips_all_own_tenant on public.trips;
create policy trips_all_own_tenant on public.trips
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

drop policy if exists current_accounts_all_own_tenant on public.current_accounts;
create policy current_accounts_all_own_tenant on public.current_accounts
for all using (tenant_id = public.current_tenant_id())
with check (tenant_id = public.current_tenant_id());

create or replace function public.create_km_record(
  p_bus_id uuid,
  p_record_date timestamptz,
  p_start_km integer,
  p_end_km integer,
  p_route text default '',
  p_notes text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile public.profiles;
  v_bus public.buses;
  v_record_id uuid;
begin
  select * into v_profile from public.current_profile();

  if v_profile.id is null or v_profile.role not in ('admin', 'supervisor', 'driver', 'demo') then
    raise exception 'No tiene permisos para registrar kilometraje.';
  end if;

  if p_end_km < p_start_km then
    raise exception 'El kilometraje final debe ser mayor o igual al inicial.';
  end if;

  select * into v_bus
  from public.buses
  where id = p_bus_id
    and tenant_id = v_profile.tenant_id;

  if v_bus.id is null then
    raise exception 'El ómnibus no existe o pertenece a otra empresa.';
  end if;

  insert into public.km_records (
    tenant_id,
    bus_id,
    bus_label,
    driver_id,
    driver_name,
    record_date,
    start_km,
    end_km,
    route,
    notes
  )
  values (
    v_profile.tenant_id,
    v_bus.id,
    v_bus.internal_number || ' - ' || v_bus.plate,
    v_profile.id,
    v_profile.display_name,
    p_record_date,
    p_start_km,
    p_end_km,
    p_route,
    p_notes
  )
  returning id into v_record_id;

  update public.buses
  set current_km = p_end_km
  where id = v_bus.id
    and tenant_id = v_profile.tenant_id;

  return v_record_id;
end;
$$;
