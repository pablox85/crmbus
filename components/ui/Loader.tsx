export function Loader({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 text-slate-700 dark:bg-slate-950 dark:text-slate-200">
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
        {label}
      </div>
    </div>
  );
}
