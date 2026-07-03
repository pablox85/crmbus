import { startOfMonth } from "date-fns";
import { listBuses } from "@/lib/services/buses";
import { getMonthlyStats } from "@/lib/services/kmRecords";
import type { DashboardMetrics } from "@/lib/types";

export async function getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
  const [buses, monthlyStats] = await Promise.all([listBuses(tenantId), getMonthlyStats(tenantId, startOfMonth(new Date()))]);

  return {
    activeBuses: buses.filter((bus) => bus.status === "active").length,
    maintenanceBuses: buses.filter((bus) => bus.status === "maintenance").length,
    kmThisMonth: monthlyStats.km,
    recordsThisMonth: monthlyStats.records
  };
}
