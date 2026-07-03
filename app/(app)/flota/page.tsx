"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/AuthProvider";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { can } from "@/lib/roles";
import { createBus, listBuses, updateBus } from "@/lib/services/buses";
import type { Bus, BusStatus } from "@/lib/types";

interface BusForm {
  internalNumber: string;
  plate: string;
  brand: string;
  model: string;
  year: string;
  currentKm: string;
  status: BusStatus;
}

export default function FleetPage() {
  const { user } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState } = useForm<BusForm>({
    defaultValues: { status: "active", currentKm: "0" }
  });

  const reload = useCallback(async () => {
    if (!user) return;
    setBuses(await listBuses(user.tenantId));
  }, [user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const startEdit = useCallback(
    (bus: Bus) => {
      setEditingId(bus.id);
      reset({
        internalNumber: bus.internalNumber,
        plate: bus.plate,
        brand: bus.brand ?? "",
        model: bus.model ?? "",
        year: bus.year ? String(bus.year) : "",
        currentKm: String(bus.currentKm),
        status: bus.status
      });
    },
    [reset]
  );

  const columns = useMemo<Column<Bus>[]>(
    () => [
      { header: "Interno", accessor: (bus) => bus.internalNumber, searchValue: (bus) => bus.internalNumber },
      { header: "Matrícula", accessor: (bus) => bus.plate, searchValue: (bus) => bus.plate },
      { header: "Marca / Modelo", accessor: (bus) => `${bus.brand ?? "-"} ${bus.model ?? ""}`, searchValue: (bus) => `${bus.brand} ${bus.model}` },
      { header: "Año", accessor: (bus) => bus.year ?? "-" },
      { header: "Km actual", accessor: (bus) => bus.currentKm.toLocaleString("es-UY") },
      { header: "Estado", accessor: (bus) => statusLabel[bus.status], searchValue: (bus) => statusLabel[bus.status] },
      {
        header: "Acciones",
        accessor: (bus) =>
          can(user?.role, "busesWrite") ? (
            <Button type="button" variant="secondary" onClick={() => startEdit(bus)}>
              Editar
            </Button>
          ) : (
            "-"
          )
      }
    ],
    [startEdit, user?.role]
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    const payload = {
      internalNumber: values.internalNumber,
      plate: values.plate,
      brand: values.brand,
      model: values.model,
      year: values.year ? Number(values.year) : undefined,
      currentKm: Number(values.currentKm),
      status: values.status
    };

    if (editingId) {
      await updateBus(editingId, user.tenantId, payload);
      setEditingId(null);
    } else {
      await createBus(user.tenantId, payload);
    }

    reset({ status: "active", currentKm: "0", internalNumber: "", plate: "", brand: "", model: "", year: "" });
    await reload();
  });

  const cancelEdit = () => {
    setEditingId(null);
    reset({ status: "active", currentKm: "0", internalNumber: "", plate: "", brand: "", model: "", year: "" });
  };

  return (
    <>
      <PageHeader title="Flota" description="ABM básico de ómnibus filtrado por tenant." />
      {can(user?.role, "busesWrite") ? (
        <form className="mb-8 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-3" onSubmit={onSubmit}>
          <Field label="Interno" required {...register("internalNumber", { required: true })} />
          <Field label="Matrícula" required {...register("plate", { required: true })} />
          <Field label="Marca" {...register("brand")} />
          <Field label="Modelo" {...register("model")} />
          <Field label="Año" type="number" {...register("year")} />
          <Field label="Km actual" type="number" required {...register("currentKm", { required: true })} />
          <SelectField label="Estado" {...register("status")}>
            <option value="active">Activo</option>
            <option value="maintenance">Mantenimiento</option>
            <option value="inactive">Inactivo</option>
          </SelectField>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={formState.isSubmitting}>{editingId ? "Actualizar" : "Guardar ómnibus"}</Button>
            {editingId ? <Button type="button" variant="ghost" onClick={cancelEdit}>Cancelar</Button> : null}
          </div>
        </form>
      ) : null}
      <DataTable columns={columns} data={buses} searchPlaceholder="Buscar por interno, matrícula o estado" />
    </>
  );
}

const statusLabel: Record<BusStatus, string> = {
  active: "Activo",
  maintenance: "Mantenimiento",
  inactive: "Inactivo"
};
