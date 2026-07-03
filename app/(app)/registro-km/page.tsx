"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { listBuses } from "@/lib/services/buses";
import { createKmRecord } from "@/lib/services/kmRecords";
import type { Bus } from "@/lib/types";

interface KmForm {
  busId: string;
  date: string;
  startKm: string;
  endKm: string;
  route: string;
  notes: string;
}

export default function RegisterKmPage() {
  const { user } = useAuth();
  const [buses, setBuses] = useState<Bus[]>([]);
  const [message, setMessage] = useState("");
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<KmForm>({
    defaultValues: { date: new Date().toISOString().slice(0, 10), route: "", notes: "" }
  });
  const selectedBusId = watch("busId");

  useEffect(() => {
    if (!user) return;
    void listBuses(user.tenantId).then((items) => {
      const activeBuses = items.filter((bus) => bus.status === "active");
      setBuses(activeBuses);
      if (activeBuses[0]) {
        setValue("busId", activeBuses[0].id);
        setValue("startKm", String(activeBuses[0].currentKm));
      }
    });
  }, [setValue, user]);

  useEffect(() => {
    const selected = buses.find((bus) => bus.id === selectedBusId);
    if (selected) setValue("startKm", String(selected.currentKm));
  }, [buses, selectedBusId, setValue]);

  const onSubmit = handleSubmit(async (values) => {
    if (!user) return;
    const bus = buses.find((item) => item.id === values.busId);
    if (!bus) return;
    setMessage("");
    try {
      await createKmRecord(user, {
        busId: bus.id,
        busLabel: `${bus.internalNumber} - ${bus.plate}`,
        date: new Date(`${values.date}T12:00:00`),
        startKm: Number(values.startKm),
        endKm: Number(values.endKm),
        route: values.route,
        notes: values.notes
      });
      setMessage("Registro guardado correctamente.");
      reset({ busId: bus.id, date: new Date().toISOString().slice(0, 10), startKm: values.endKm, endKm: "", route: "", notes: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el registro.");
    }
  });

  return (
    <>
      <PageHeader title="Registro de kilómetros" description="Carga rápida para choferes, supervisores y administradores." />
      <form className="grid max-w-3xl gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2" onSubmit={onSubmit}>
        <SelectField label="Ómnibus" required {...register("busId", { required: true })}>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.internalNumber} - {bus.plate}
            </option>
          ))}
        </SelectField>
        <Field label="Fecha" type="date" required {...register("date", { required: true })} />
        <Field label="Km inicial" type="number" required {...register("startKm", { required: true })} />
        <Field label="Km final" type="number" required {...register("endKm", { required: true })} />
        <Field label="Recorrido" {...register("route")} />
        <div className="md:col-span-2">
          <TextAreaField label="Notas" {...register("notes")} />
        </div>
        {message ? <p className="text-sm text-slate-600 dark:text-slate-300 md:col-span-2">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={formState.isSubmitting || buses.length === 0}>Guardar registro</Button>
        </div>
      </form>
    </>
  );
}
