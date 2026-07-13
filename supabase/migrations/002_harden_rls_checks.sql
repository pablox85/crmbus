-- Evita que un usuario inserte kilometraje en su tenant referenciando un bus de otro tenant.
drop policy if exists km_records_insert_authorized on public.km_records;
create policy km_records_insert_authorized on public.km_records
for insert with check (
  tenant_id = public.current_tenant_id()
  and driver_id = auth.uid()
  and public.current_role() in ('admin', 'supervisor', 'driver', 'demo')
  and exists (
    select 1
    from public.buses
    where buses.id = km_records.bus_id
      and buses.tenant_id = public.current_tenant_id()
  )
);

-- Evita lecturas, escrituras, updates o deletes fuera del tenant y bloquea referencias cruzadas a buses/choferes ajenos.
drop policy if exists hour_records_all_own_tenant on public.hour_records;
create policy hour_records_all_own_tenant on public.hour_records
for all using (
  tenant_id = public.current_tenant_id()
)
with check (
  tenant_id = public.current_tenant_id()
  and (
    bus_id is null
    or exists (
      select 1
      from public.buses
      where buses.id = hour_records.bus_id
        and buses.tenant_id = public.current_tenant_id()
    )
  )
  and (
    driver_id is null
    or exists (
      select 1
      from public.profiles
      where profiles.id = hour_records.driver_id
        and profiles.tenant_id = public.current_tenant_id()
    )
  )
);

-- Evita lecturas, escrituras, updates o deletes fuera del tenant y bloquea viajes enlazados a buses/choferes de otro tenant.
drop policy if exists trips_all_own_tenant on public.trips;
create policy trips_all_own_tenant on public.trips
for all using (
  tenant_id = public.current_tenant_id()
)
with check (
  tenant_id = public.current_tenant_id()
  and (
    bus_id is null
    or exists (
      select 1
      from public.buses
      where buses.id = trips.bus_id
        and buses.tenant_id = public.current_tenant_id()
    )
  )
  and (
    driver_id is null
    or exists (
      select 1
      from public.profiles
      where profiles.id = trips.driver_id
        and profiles.tenant_id = public.current_tenant_id()
    )
  )
);
