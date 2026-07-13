"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { listAuditLog } from "@/lib/services/auditLog";
import type { AuditLogEntry } from "@/lib/types";

const tableOptions = ["profiles", "buses", "km_records", "current_accounts", "tenants"];

const actionLabels: Record<AuditLogEntry["action"], string> = {
  insert: "Alta",
  update: "Cambio",
  delete: "Baja"
};

function summarize(entry: AuditLogEntry): string {
  const data = entry.newData ?? entry.oldData;
  if (!data) return "-";
  const keys = Object.keys(data).filter((key) => !["created_at", "updated_at"].includes(key)).slice(0, 4);
  return keys.map((key) => `${key}: ${String(data[key])}`).join(" | ");
}

export default function AuditPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [tableName, setTableName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const reload = useCallback(async () => {
    if (!user) return;
    setEntries(
      await listAuditLog(user.tenantId, {
        tableName: tableName || undefined,
        dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`) : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`) : undefined
      })
    );
  }, [dateFrom, dateTo, tableName, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const columns = useMemo<Column<AuditLogEntry>[]>(
    () => [
      {
        header: "Fecha",
        accessor: (entry) => format(entry.createdAt.toDate(), "dd/MM/yyyy HH:mm"),
        searchValue: (entry) => format(entry.createdAt.toDate(), "dd/MM/yyyy HH:mm")
      },
      { header: "Tabla", accessor: (entry) => entry.tableName, searchValue: (entry) => entry.tableName },
      { header: "Acción", accessor: (entry) => actionLabels[entry.action], searchValue: (entry) => actionLabels[entry.action] },
      { header: "Registro", accessor: (entry) => entry.recordId, searchValue: (entry) => entry.recordId },
      { header: "Actor", accessor: (entry) => entry.actorProfileId ?? "-", searchValue: (entry) => entry.actorProfileId ?? "" },
      { header: "Resumen", accessor: summarize, searchValue: summarize }
    ],
    []
  );

  return (
    <>
      <PageHeader title="Auditoría" description="Bitácora de cambios del tenant actual." />
      <div className="mb-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <SelectField label="Tabla" value={tableName} onChange={(event) => setTableName(event.target.value)}>
          <option value="">Todas</option>
          {tableOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectField>
        <Field label="Desde" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <Field label="Hasta" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <div className="flex items-end">
          <Button onClick={reload} type="button">Aplicar filtros</Button>
        </div>
      </div>
      <DataTable columns={columns} data={entries} searchPlaceholder="Buscar por tabla, acción, registro o actor" />
    </>
  );
}
