"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { getTenant, updateTenant } from "@/lib/services/tenants";

interface TenantForm {
  name: string;
  rut: string;
  address: string;
  contactEmail: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, formState } = useForm<TenantForm>();

  useEffect(() => {
    if (!user) return;
    void getTenant(user.tenantId).then((tenant) => {
      if (!tenant) return;
      reset({
        name: tenant.name,
        rut: tenant.rut ?? "",
        address: tenant.address ?? "",
        contactEmail: tenant.contactEmail ?? ""
      });
    });
  }, [reset, user]);

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    await updateTenant(user.tenantId, values);
    setMessage("Configuración guardada.");
  });

  return (
    <>
      <PageHeader title="Configuración" description="Datos básicos de la empresa del tenant actual." />
      <form className="grid max-w-3xl gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2" onSubmit={onSubmit}>
        <Field label="Nombre de empresa" required {...register("name", { required: true })} />
        <Field label="RUT" {...register("rut")} />
        <Field label="Dirección" {...register("address")} />
        <Field label="Email de contacto" type="email" {...register("contactEmail")} />
        {message ? <p className="text-sm text-slate-600 dark:text-slate-300 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={formState.isSubmitting}>Guardar configuración</Button>
        </div>
      </form>
    </>
  );
}
