// DEMO_ONLY
// REMOVE_BEFORE_PRODUCTION

import { demoCredentials, demoSeed } from "@/src/demo/seed";
import { AppTimestamp } from "@/lib/datetime";
import type {
  AppRepository,
  AuthRepository,
  AuthUser,
  BusInput,
  KmRecordFilters,
  KmRecordInput,
  UserProfileInput
} from "@/lib/repositories/types";
import type { AppUser, Bus, KmRecord, Tenant } from "@/lib/types";

declare global {
  interface Window {
    crmbusResetDemoData?: () => void;
  }
}

const storageKey = "crmbus.demo.state";
const sessionKey = "crmbus.demo.session";

interface DemoState {
  tenants: Tenant[];
  users: AppUser[];
  buses: Bus[];
  kmRecords: KmRecord[];
  futureEntities: Record<string, unknown[]>;
}

type SerializedTimestamp = { __timestamp: number };

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function cloneSeed(): DemoState {
  return {
    tenants: demoSeed.tenants.map((item) => ({ ...item })),
    users: demoSeed.users.map((item) => ({ ...item })),
    buses: demoSeed.buses.map((item) => ({ ...item })),
    kmRecords: demoSeed.kmRecords.map((item) => ({ ...item })),
    futureEntities: { ...demoSeed.futureEntities }
  };
}

function serializeTimestamp(value: unknown): unknown {
  if (value instanceof AppTimestamp) return { __timestamp: value.toMillis() } satisfies SerializedTimestamp;
  if (Array.isArray(value)) return value.map(serializeTimestamp);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeTimestamp(item)])
    );
  }
  return value;
}

function hydrateTimestamp(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(hydrateTimestamp);
  if (value && typeof value === "object") {
    if ("__timestamp" in value && typeof value.__timestamp === "number") {
      return AppTimestamp.fromMillis(value.__timestamp);
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, hydrateTimestamp(item)])
    );
  }
  return value;
}

function loadState(): DemoState {
  if (!isBrowser()) return cloneSeed();
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    const initial = cloneSeed();
    saveState(initial);
    return initial;
  }
  return hydrateTimestamp(JSON.parse(raw)) as DemoState;
}

function saveState(state: DemoState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(storageKey, JSON.stringify(serializeTimestamp(state)));
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function now(): AppTimestamp {
  return AppTimestamp.fromDate(new Date());
}

function resetDemoData(): void {
  saveState(cloneSeed());
}

if (isBrowser()) {
  window.localStorage.getItem(storageKey) ?? saveState(cloneSeed());
  Object.assign(window, { crmbusResetDemoData: resetDemoData });
}

class DemoAuthRepository implements AuthRepository {
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    const uid = isBrowser() ? window.localStorage.getItem(sessionKey) : null;
    const credential = demoCredentials.find((item) => item.uid === uid);
    queueMicrotask(() => callback(credential ? { uid: credential.uid, email: credential.email } : null));
    return () => {};
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const credential = demoCredentials.find((item) => item.email === email && item.password === password);
    if (!credential) throw new Error("Credenciales demo inválidas.");
    if (isBrowser()) window.localStorage.setItem(sessionKey, credential.uid);
    return { uid: credential.uid, email: credential.email };
  }

  async signOut(): Promise<void> {
    if (isBrowser()) window.localStorage.removeItem(sessionKey);
  }
}

class DemoRepository implements AppRepository {
  async getUserProfile(uid: string): Promise<AppUser | null> {
    return loadState().users.find((user) => user.id === uid) ?? null;
  }

  async listUsers(tenantId: string): Promise<AppUser[]> {
    return loadState()
      .users.filter((user) => user.tenantId === tenantId)
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  async createUserProfile(input: UserProfileInput): Promise<void> {
    const state = loadState();
    state.users = state.users.filter((user) => user.id !== input.uid);
    state.users.push({
      id: input.uid,
      tenantId: input.tenantId,
      displayName: input.displayName,
      email: input.email,
      role: input.role,
      active: input.active,
      createdAt: now(),
      updatedAt: now()
    });
    saveState(state);
  }

  async updateUserRole(userId: string, input: { role: AppUser["role"]; active: boolean }): Promise<void> {
    const state = loadState();
    state.users = state.users.map((user) =>
      user.id === userId ? { ...user, ...input, updatedAt: now() } : user
    );
    saveState(state);
  }

  async listBuses(tenantId: string): Promise<Bus[]> {
    return loadState()
      .buses.filter((bus) => bus.tenantId === tenantId)
      .sort((a, b) => a.internalNumber.localeCompare(b.internalNumber));
  }

  async createBus(tenantId: string, input: BusInput): Promise<string> {
    const state = loadState();
    const id = createId("bus");
    state.buses.push({
      id,
      tenantId,
      ...input,
      createdAt: now(),
      updatedAt: now()
    });
    saveState(state);
    return id;
  }

  async updateBus(
    busId: string,
    tenantId: string,
    input: Partial<Omit<Bus, "id" | "tenantId" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const state = loadState();
    state.buses = state.buses.map((bus) =>
      bus.id === busId && bus.tenantId === tenantId ? { ...bus, ...input, updatedAt: now() } : bus
    );
    saveState(state);
  }

  async listKmRecords(user: AppUser, filters: KmRecordFilters = {}): Promise<KmRecord[]> {
    return loadState()
      .kmRecords.filter((record) => {
        if (record.tenantId !== user.tenantId) return false;
        if (user.role === "driver" && record.driverId !== user.id) return false;
        if (user.role !== "driver" && filters.driverId && record.driverId !== filters.driverId) return false;
        if (filters.busId && record.busId !== filters.busId) return false;
        if (filters.dateFrom && record.date.toDate() < filters.dateFrom) return false;
        if (filters.dateTo && record.date.toDate() > filters.dateTo) return false;
        return true;
      })
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }

  async createKmRecord(user: AppUser, input: KmRecordInput): Promise<string> {
    const totalKm = input.endKm - input.startKm;
    if (totalKm < 0) throw new Error("El kilometraje final debe ser mayor o igual al inicial.");

    const state = loadState();
    const bus = state.buses.find((item) => item.id === input.busId && item.tenantId === user.tenantId);
    if (!bus) throw new Error("El ómnibus no existe o pertenece a otra empresa.");

    const id = createId("km");
    state.kmRecords.push({
      id,
      tenantId: user.tenantId,
      busId: input.busId,
      busLabel: input.busLabel,
      driverId: user.id,
      driverName: user.displayName,
      date: AppTimestamp.fromDate(input.date),
      startKm: input.startKm,
      endKm: input.endKm,
      totalKm,
      route: input.route ?? "",
      notes: input.notes ?? "",
      createdAt: now(),
      updatedAt: now()
    });
    state.buses = state.buses.map((item) =>
      item.id === bus.id ? { ...item, currentKm: input.endKm, updatedAt: now() } : item
    );
    saveState(state);
    return id;
  }

  async getMonthlyStats(tenantId: string, monthStart: Date): Promise<{ km: number; records: number }> {
    return loadState().kmRecords.reduce(
      (acc, record) => {
        if (record.tenantId === tenantId && record.date.toDate() >= monthStart) {
          acc.records += 1;
          acc.km += record.totalKm;
        }
        return acc;
      },
      { km: 0, records: 0 }
    );
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    return loadState().tenants.find((tenant) => tenant.id === tenantId) ?? null;
  }

  async updateTenant(tenantId: string, input: Pick<Tenant, "name" | "rut" | "address" | "contactEmail">): Promise<void> {
    const state = loadState();
    state.tenants = state.tenants.map((tenant) =>
      tenant.id === tenantId ? { ...tenant, ...input, updatedAt: now() } : tenant
    );
    saveState(state);
  }
}

export function createDemoRepositories(): { appRepository: AppRepository; authRepository: AuthRepository } {
  return {
    appRepository: new DemoRepository(),
    authRepository: new DemoAuthRepository()
  };
}
