create or replace function public.can_manage_tenant_operations()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_role() in ('admin', 'supervisor', 'demo')
$$;

create or replace function public.can_assign_profile_role(p_role public.app_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    public.current_role() in ('admin', 'demo')
    or (
      public.current_role() = 'supervisor'
      and p_role in ('driver', 'readonly')
    )
$$;

drop policy if exists tenants_update_admin on public.tenants;
create policy tenants_update_admin on public.tenants
for update using (
  id = public.current_tenant_id()
  and public.can_manage_tenant_operations()
)
with check (id = public.current_tenant_id());

drop policy if exists buses_insert_admin on public.buses;
create policy buses_insert_admin on public.buses
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.can_manage_tenant_operations()
);

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
for insert with check (
  tenant_id = public.current_tenant_id()
  and public.can_assign_profile_role(role)
);

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
for update using (
  tenant_id = public.current_tenant_id()
  and (
    public.current_role() in ('admin', 'demo')
    or (
      public.current_role() = 'supervisor'
      and role in ('driver', 'readonly')
    )
  )
)
with check (
  tenant_id = public.current_tenant_id()
  and public.can_assign_profile_role(role)
);
