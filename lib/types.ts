import type { AppTimestamp } from "@/lib/datetime";

export type Role = "admin" | "supervisor" | "driver" | "readonly" | "demo";

export type BusStatus = "active" | "maintenance" | "inactive";

export interface Tenant {
  id: string;
  name: string;
  rut?: string;
  address?: string;
  contactEmail?: string;
  createdAt: AppTimestamp;
  updatedAt: AppTimestamp;
}

export interface AppUser {
  id: string;
  tenantId: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: AppTimestamp;
  updatedAt: AppTimestamp;
}

export interface Bus {
  id: string;
  tenantId: string;
  internalNumber: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  currentKm: number;
  status: BusStatus;
  createdAt: AppTimestamp;
  updatedAt: AppTimestamp;
}

export interface KmRecord {
  id: string;
  tenantId: string;
  busId: string;
  busLabel: string;
  driverId: string;
  driverName: string;
  date: AppTimestamp;
  startKm: number;
  endKm: number;
  totalKm: number;
  route?: string;
  notes?: string;
  createdAt: AppTimestamp;
  updatedAt: AppTimestamp;
}

export interface TenantScoped {
  tenantId: string;
}

export interface DashboardMetrics {
  activeBuses: number;
  maintenanceBuses: number;
  kmThisMonth: number;
  recordsThisMonth: number;
}
