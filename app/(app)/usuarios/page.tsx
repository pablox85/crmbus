"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/AuthProvider";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { roleLabels } from "@/lib/roles";
import { createManualUser, inviteUser, listUsers, updateUserRole } from "@/lib/services/users";
import type { AppUser, Role } from "@/lib/types";

interface InviteForm {
  displayName: string;
  email: string;
  role: Role;
}

interface ManualUserForm {
  displayName: string;
  email: string;
  password: string;
  role: Role;
}

const roleOptions: Array<{ value: Role; label: string }> = [
  { value: "admin", label: "Administrador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "driver", label: "Chofer" },
  { value: "readonly", label: "Solo Lectura" },
  { value: "demo", label: "Demo" }
];

function getAssignableRoles(currentRole: Role | undefined): Array<{ value: Role; label: string }> {
  if (currentRole === "supervisor") {
    return roleOptions.filter((option) => option.value === "driver" || option.value === "readonly");
  }

  return roleOptions;
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [message, setMessage] = useState("");
  const [savingUserId, setSavingUserId] = useState("");
  const inviteForm = useForm<InviteForm>({ defaultValues: { role: "driver" } });
  const manualForm = useForm<ManualUserForm>({ defaultValues: { role: "driver" } });
  const assignableRoles = useMemo(() => getAssignableRoles(user?.role), [user?.role]);

  const reload = useCallback(async () => {
    if (!user) return;
    setUsers(await listUsers(user.tenantId));
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleRoleChange = useCallback((userId: string, role: Role) => {
    setUsers((current) => current.map((item) => (item.id === userId ? { ...item, role } : item)));
  }, []);

  const handleActiveChange = useCallback((userId: string, active: boolean) => {
    setUsers((current) => current.map((item) => (item.id === userId ? { ...item, active } : item)));
  }, []);

  const handleSavePermissions = useCallback(
    async (item: AppUser) => {
      setMessage("");
      if (!assignableRoles.some((option) => option.value === item.role)) {
        setMessage("No tenés permiso para asignar ese rol.");
        return;
      }

      setSavingUserId(item.id);
      try {
        await updateUserRole(item.id, { role: item.role, active: item.active });
        setMessage(`Permisos actualizados para ${item.displayName}.`);
        await reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudieron actualizar los permisos.");
      } finally {
        setSavingUserId("");
      }
    },
    [assignableRoles, reload]
  );

  const columns = useMemo<Column<AppUser>[]>(
    () => [
      { header: "Nombre", accessor: (item) => item.displayName, searchValue: (item) => item.displayName },
      { header: "Email", accessor: (item) => item.email, searchValue: (item) => item.email },
      { header: "Rol", accessor: (item) => roleLabels[item.role], searchValue: (item) => roleLabels[item.role] },
      { header: "Estado", accessor: (item) => (item.active ? "Activo" : "Inactivo"), searchValue: (item) => (item.active ? "Activo" : "Inactivo") },
      {
        header: "Cambiar permisos",
        accessor: (item) => (
          <div className="min-w-[420px] rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cambiar permisos</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aplica al guardar</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                  {roleLabels[item.role]}
                </span>
                <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {item.active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(150px,1fr)_130px_auto] md:items-end">
              <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Nuevo rol</span>
                <select
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={item.role}
                  onChange={(event) => handleRoleChange(item.id, event.target.value as Role)}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={!assignableRoles.some((assignable) => assignable.value === option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Acceso</span>
                <select
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={item.active ? "active" : "inactive"}
                  onChange={(event) => handleActiveChange(item.id, event.target.value === "active")}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </label>
              <Button type="button" variant="secondary" disabled={savingUserId === item.id} onClick={() => void handleSavePermissions(item)}>
                {savingUserId === item.id ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        ),
        searchValue: () => ""
      }
    ],
    [assignableRoles, handleActiveChange, handleRoleChange, handleSavePermissions, savingUserId]
  );

  const onInviteSubmit = inviteForm.handleSubmit(async (values) => {
    if (!user) return;
    setMessage("");
    try {
      await inviteUser(user.tenantId, values.email, values.displayName, values.role);
      setMessage("Invitación enviada y perfil creado/actualizado en la base de datos.");
      inviteForm.reset({ displayName: "", email: "", role: "driver" });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo invitar al usuario.");
    }
  });

  const onManualSubmit = manualForm.handleSubmit(async (values) => {
    if (!user) return;
    setMessage("");
    try {
      await createManualUser({ tenantId: user.tenantId, ...values });
      setMessage("Usuario creado manualmente con contraseña y perfil en la base de datos.");
      manualForm.reset({ displayName: "", email: "", password: "", role: "driver" });
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el usuario manual.");
    }
  });

  return (
    <>
      <PageHeader title="Usuarios" description="Invitaciones, perfiles y roles del tenant actual." />
      <form className="mb-4 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4" onSubmit={onInviteSubmit}>
        <Field label="Nombre" required {...inviteForm.register("displayName", { required: true })} />
        <Field label="Email" type="email" required {...inviteForm.register("email", { required: true })} />
        <SelectField label="Rol" {...inviteForm.register("role")}>
          {assignableRoles.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <div className="flex items-end">
          <Button type="submit" disabled={inviteForm.formState.isSubmitting}>Invitar usuario</Button>
        </div>
      </form>
      <details className="mb-8 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-200">Alta Manual</summary>
        <form className="mt-4 grid gap-4 md:grid-cols-5" onSubmit={onManualSubmit}>
          <Field label="Nombre" required {...manualForm.register("displayName", { required: true })} />
          <Field label="Email" type="email" required {...manualForm.register("email", { required: true })} />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            required
            {...manualForm.register("password", { required: true, minLength: 8 })}
          />
          <SelectField label="Rol" {...manualForm.register("role")}>
            {assignableRoles.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" disabled={manualForm.formState.isSubmitting}>Guardar perfil</Button>
          </div>
        </form>
      </details>
      {message ? <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{message}</p> : null}
      <DataTable columns={columns} data={users} searchPlaceholder="Buscar por nombre, email o rol" />
    </>
  );
}
