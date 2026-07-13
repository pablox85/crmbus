drop trigger if exists tenants_audit_log on public.tenants;
create trigger tenants_audit_log
after insert or update or delete on public.tenants
for each row execute function public.write_audit_log();
