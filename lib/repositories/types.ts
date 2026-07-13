import type { AppUser, AuditLogEntry, Bus, BusStatus, KmRecord, Role, Tenant } from "@/lib/types";

export interface AuthUser {
  uid: string;
  email: string | null;
}

export interface UserProfileInput {
  uid: string;
  tenantId: string;
  displayName: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface BusInput {
  internalNumber: string;
  plate: string;
  brand?: string;
  model?: string;
  year?: number;
  currentKm: number;
  status: BusStatus;
}

export interface KmRecordFilters {
  busId?: string;
  driverId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface KmRecordInput {
  busId: string;
  busLabel: string;
  date: Date;
  startKm: number;
  endKm: number;
  route?: string;
  notes?: string;
}

export interface AuditLogFilters {
  tableName?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface AuthRepository {
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
}

export interface AppRepository {
  getUserProfile(uid: string): Promise<AppUser | null>;
  listUsers(tenantId: string): Promise<AppUser[]>;
  createUserProfile(input: UserProfileInput): Promise<void>;
  updateUserRole(userId: string, input: { role: Role; active: boolean }): Promise<void>;
  listBuses(tenantId: string): Promise<Bus[]>;
  createBus(tenantId: string, input: BusInput): Promise<string>;
  updateBus(
    busId: string,
    tenantId: string,
    input: Partial<Omit<Bus, "id" | "tenantId" | "createdAt" | "updatedAt">>
  ): Promise<void>;
  listKmRecords(user: AppUser, filters?: KmRecordFilters): Promise<KmRecord[]>;
  createKmRecord(user: AppUser, input: KmRecordInput): Promise<string>;
  getMonthlyStats(tenantId: string, monthStart: Date): Promise<{ km: number; records: number }>;
  getTenant(tenantId: string): Promise<Tenant | null>;
  updateTenant(tenantId: string, input: Pick<Tenant, "name" | "rut" | "address" | "contactEmail">): Promise<void>;
  listAuditLog(tenantId: string, filters?: AuditLogFilters): Promise<AuditLogEntry[]>;
}
