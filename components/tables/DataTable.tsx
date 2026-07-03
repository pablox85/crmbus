"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";

export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  searchValue?: (row: T) => string;
}

export function DataTable<T>({ columns, data, searchPlaceholder = "Buscar..." }: { columns: Column<T>[]; data: T[]; searchPlaceholder?: string }) {
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedSearch) return data;
    return data.filter((row) =>
      columns.some((column) => {
        const value = column.searchValue?.(row);
        return value?.toLowerCase().includes(normalizedSearch);
      })
    );
  }, [columns, data, normalizedSearch]);

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Field label="Búsqueda" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <tr>
                {columns.map((column) => (
                  <th key={column.header} className="px-4 py-3 font-semibold">
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filtered.length ? (
                filtered.map((row, index) => (
                  <tr key={index} className="text-slate-700 dark:text-slate-200">
                    {columns.map((column) => (
                      <td key={column.header} className="px-4 py-3">
                        {column.accessor(row)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                    No hay datos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
