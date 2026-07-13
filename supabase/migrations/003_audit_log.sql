create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create or replace function public.can_read_audit_log()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() in ('admin', 'supervisor')
$$;

drop policy if exists audit_log_select_admin_supervisor on public.audit_log;
create policy audit_log_select_admin_supervisor on public.audit_log
for select using (
  tenant_id = public.current_tenant_id()
  and public.can_read_audit_log()
);

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_record_id uuid;
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_tenant_id := new.tenant_id;
    v_record_id := new.id;
    v_action := 'insert';
  elsif tg_op = 'UPDATE' then
    v_tenant_id := new.tenant_id;
    v_record_id := new.id;
    v_action := 'update';
  elsif tg_op = 'DELETE' then
    v_tenant_id := old.tenant_id;
    v_record_id := old.id;
    v_action := 'delete';
  else
    raise exception 'Operacion de auditoria no soportada: %', tg_op;
  end if;

  insert into public.audit_log (
    tenant_id,
    actor_profile_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  values (
    v_tenant_id,
    auth.uid(),
    tg_table_name,
    v_record_id,
    v_action,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_audit_log on public.profiles;
create trigger profiles_audit_log
after insert or update or delete on public.profiles
for each row execute function public.write_audit_log();

drop trigger if exists buses_audit_log on public.buses;
create trigger buses_audit_log
after insert or update or delete on public.buses
for each row execute function public.write_audit_log();

drop trigger if exists km_records_audit_log on public.km_records;
create trigger km_records_audit_log
after insert or update or delete on public.km_records
for each row execute function public.write_audit_log();

drop trigger if exists current_accounts_audit_log on public.current_accounts;
create trigger current_accounts_audit_log
after insert or update or delete on public.current_accounts
for each row execute function public.write_audit_log();

create or replace function public.handle_auth_user_profile_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_display_name text;
  v_role public.app_role;
begin
  if new.raw_user_meta_data ? 'tenant_id'
    and new.raw_user_meta_data ? 'display_name'
    and new.raw_user_meta_data ? 'role'
  then
    v_tenant_id := (new.raw_user_meta_data ->> 'tenant_id')::uuid;
    v_display_name := new.raw_user_meta_data ->> 'display_name';
    v_role := (new.raw_user_meta_data ->> 'role')::public.app_role;

    insert into public.profiles (
      id,
      tenant_id,
      display_name,
      email,
      role,
      active
    )
    values (
      new.id,
      v_tenant_id,
      v_display_name,
      coalesce(new.email, ''),
      v_role,
      true
    )
    on conflict (id) do update
    set
      tenant_id = excluded.tenant_id,
      display_name = excluded.display_name,
      email = excluded.email,
      role = excluded.role,
      active = excluded.active;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile_invite on auth.users;
create trigger on_auth_user_created_profile_invite
after insert on auth.users
for each row execute function public.handle_auth_user_profile_invite();
