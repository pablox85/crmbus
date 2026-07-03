"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { listBuses } from "@/lib/services/buses";
import { listKmRecords } from "@/lib/services/kmRecords";
import type { Bus, KmRecord } from "@/lib/types";

export default function HistoryPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<KmRecord[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busId, setBusId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const reload = async () => {
    if (!user) return;
    setRecords(
      await listKmRecords(user, {
        busId: busId || undefined,
        dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`) : undefined
      })
    );
  };

  useEffect(() => {
    if (!user) return;
    void Promise.all([listBuses(user.tenantId), listKmRecords(user)]).then(([busItems, recordItems]) => {
      setBuses(busItems);
      setRecords(recordItems);
    });
  }, [user]);

  const columns = useMemo<Column<KmRecord>[]>(
    () => [
      { header: "Fecha", accessor: (record) => format(record.date.toDate(), "dd/MM/yyyy"), searchValue: (record) => format(record.date.toDate(), "dd/MM/yyyy") },
      { header: "Ómnibus", accessor: (record) => record.busLabel, searchValue: (record) => record.busLabel },
      { header: "Chofer", accessor: (record) => record.driverName, searchValue: (record) => record.driverName },
      { header: "Km inicial", accessor: (record) => record.startKm.toLocaleString("es-UY") },
      { header: "Km final", accessor: (record) => record.endKm.toLocaleString("es-UY") },
      { header: "Total", accessor: (record) => record.totalKm.toLocaleString("es-UY") },
      { header: "Recorrido", accessor: (record) => record.route || "-", searchValue: (record) => record.route ?? "" }
    ],
    []
  );

  return (
    <>
      <PageHeader title="Historial" description={user?.role === "driver" ? "Tus registros de kilometraje." : "Registros de kilometraje del tenant actual."} />
      <div className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <SelectField label="Ómnibus" value={busId} onChange={(event) => setBusId(event.target.value)}>
          <option value="">Todos</option>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.internalNumber} - {bus.plate}
            </option>
          ))}
        </SelectField>
        <Field label="Desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Field label="Hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <div className="flex items-end">
          <Button onClick={reload} type="button">Aplicar filtros</Button>
        </div>
      </div>
      <DataTable columns={columns} data={records} searchPlaceholder="Buscar por ómnibus, chofer o recorrido" />
    </>
  );
}
