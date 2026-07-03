"use client";

import { BusFront, Gauge, History, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { getDashboardMetrics } from "@/lib/services/dashboard";
import type { DashboardMetrics } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    if (!user) return;
    void getDashboardMetrics(user.tenantId).then(setMetrics);
  }, [user]);

  return (
    <>
      <PageHeader title="Dashboard" description="Métricas principales de la empresa actual." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Ómnibus activos" value={metrics?.activeBuses ?? "..."} icon={BusFront} />
        <MetricCard title="En mantenimiento" value={metrics?.maintenanceBuses ?? "..."} icon={Wrench} />
        <MetricCard title="Km del mes" value={metrics?.kmThisMonth ?? "..."} icon={Gauge} />
        <MetricCard title="Registros del mes" value={metrics?.recordsThisMonth ?? "..."} icon={History} />
      </div>
    </>
  );
}
