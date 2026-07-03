import type { LucideIcon } from "lucide-react";

export function MetricCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className="rounded-md bg-brand-50 p-3 text-brand-700 dark:bg-slate-800 dark:text-brand-100">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      </div>
    </div>
  );
}
