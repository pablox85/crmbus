"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/AuthProvider";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { roleLabels } from "@/lib/roles";
import { createUserProfile, listUsers } from "@/lib/services/users";
import type { AppUser, Role } from "@/lib/types";

interface UserForm {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const { register, handleSubmit, reset, formState } = useForm<UserForm>({ defaultValues: { role: "driver" } });

  const reload = useCallback(async () => {
    if (!user) return;
    setUsers(await listUsers(user.tenantId));
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const columns = useMemo<Column<AppUser>[]>(
    () => [
      { header: "Nombre", accessor: (item) => item.displayName, searchValue: (item) => item.displayName },
      { header: "Email", accessor: (item) => item.email, searchValue: (item) => item.email },
      { header: "Rol", accessor: (item) => roleLabels[item.role], searchValue: (item) => roleLabels[item.role] },
      { header: "Estado", accessor: (item) => (item.active ? "Activo" : "Inactivo"), searchValue: (item) => (item.active ? "Activo" : "Inactivo") }
    ],
    []
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    await createUserProfile({ tenantId: user.tenantId, ...values, active: true });
    reset({ uid: "", displayName: "", email: "", role: "driver" });
    await reload();
  });

  return (
    <>
      <PageHeader title="Usuarios" description="Perfiles y roles. Creá la cuenta en Supabase Auth y pegá aquí su UUID para vincularla al tenant." />
      <form className="mb-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-5" onSubmit={onSubmit}>
        <Field label="UID Auth" required {...register("uid", { required: true })} />
        <Field label="Nombre" required {...register("displayName", { required: true })} />
        <Field label="Email" type="email" required {...register("email", { required: true })} />
        <SelectField label="Rol" {...register("role")}>
          <option value="admin">Administrador</option>
          <option value="supervisor">Supervisor</option>
          <option value="driver">Chofer</option>
          <option value="readonly">Solo Lectura</option>
          <option value="demo">Demo</option>
        </SelectField>
        <div className="flex items-end">
          <Button type="submit" disabled={formState.isSubmitting}>Guardar perfil</Button>
        </div>
      </form>
      <DataTable columns={columns} data={users} searchPlaceholder="Buscar por nombre, email o rol" />
    </>
  );
}
