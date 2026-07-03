import { supabase } from "@/lib/supabase/client";
import { AppTimestamp } from "@/lib/datetime";
import type { AppUser, Bus, BusStatus, KmRecord, Role, Tenant } from "@/lib/types";
import type {
  AppRepository,
  AuthRepository,
  AuthUser,
  BusInput,
  KmRecordFilters,
  KmRecordInput,
  UserProfileInput
} from "@/lib/repositories/types";

interface ProfileRow {
  id: string;
  tenant_id: string;
  display_name: string;
  email: string;
  role: Role;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantRow {
  id: string;
  name: string;
  rut: string | null;
  address: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
}

interface BusRow {
  id: string;
  tenant_id: string;
  internal_number: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  current_km: number;
  status: BusStatus;
  created_at: string;
  updated_at: string;
}

interface KmRecordRow {
  id: string;
  tenant_id: string;
  bus_id: string;
  bus_label: string;
  driver_id: string;
  driver_name: string;
  record_date: string;
  start_km: number;
  end_km: number;
  total_km: number;
  route: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return { uid: user.id, email: user.email ?? null };
}

function toTimestamp(value: string): AppTimestamp {
  return AppTimestamp.fromISOString(value);
}

function mapProfile(row: ProfileRow): AppUser {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    rut: row.rut ?? undefined,
    address: row.address ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

function mapBus(row: BusRow): Bus {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    internalNumber: row.internal_number,
    plate: row.plate,
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    year: row.year ?? undefined,
    currentKm: row.current_km,
    status: row.status,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

function mapKmRecord(row: KmRecordRow): KmRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    busId: row.bus_id,
    busLabel: row.bus_label,
    driverId: row.driver_id,
    driverName: row.driver_name,
    date: toTimestamp(row.record_date),
    startKm: row.start_km,
    endKm: row.end_km,
    totalKm: row.total_km,
    route: row.route ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: toTimestamp(row.created_at),
    updatedAt: toTimestamp(row.updated_at)
  };
}

function throwIfError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export class SupabaseAuthRepository implements AuthRepository {
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    void supabase.auth.getSession().then(({ data }) => {
      callback(data.session?.user ? toAuthUser(data.session.user) : null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? toAuthUser(session.user) : null);
    });

    return () => data.subscription.unsubscribe();
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    throwIfError(error);
    if (!data.user) throw new Error("No se pudo iniciar sesión.");
    return toAuthUser(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
  }
}

export class SupabaseRepository implements AppRepository {
  async getUserProfile(uid: string): Promise<AppUser | null> {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle<ProfileRow>();
    throwIfError(error);
    return data ? mapProfile(data) : null;
  }

  async listUsers(tenantId: string): Promise<AppUser[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("display_name");
    throwIfError(error);
    return ((data ?? []) as ProfileRow[]).map(mapProfile);
  }

  async createUserProfile(input: UserProfileInput): Promise<void> {
    const { error } = await supabase.from("profiles").upsert({
      id: input.uid,
      tenant_id: input.tenantId,
      display_name: input.displayName,
      email: input.email,
      role: input.role,
      active: input.active
    });
    throwIfError(error);
  }

  async updateUserRole(userId: string, input: { role: Role; active: boolean }): Promise<void> {
    const { error } = await supabase
      .from("profiles")
      .update({ role: input.role, active: input.active })
      .eq("id", userId);
    throwIfError(error);
  }

  async listBuses(tenantId: string): Promise<Bus[]> {
    const { data, error } = await supabase
      .from("buses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("internal_number");
    throwIfError(error);
    return ((data ?? []) as BusRow[]).map(mapBus);
  }

  async createBus(tenantId: string, input: BusInput): Promise<string> {
    const { data, error } = await supabase
      .from("buses")
      .insert({
        tenant_id: tenantId,
        internal_number: input.internalNumber,
        plate: input.plate,
        brand: input.brand ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        current_km: input.currentKm,
        status: input.status
      })
      .select("id")
      .single<{ id: string }>();
    throwIfError(error);
    if (!data) throw new Error("No se pudo crear el ómnibus.");
    return data.id;
  }

  async updateBus(
    busId: string,
    tenantId: string,
    input: Partial<Omit<Bus, "id" | "tenantId" | "createdAt" | "updatedAt">>
  ): Promise<void> {
    const { error } = await supabase
      .from("buses")
      .update({
        internal_number: input.internalNumber,
        plate: input.plate,
        brand: input.brand,
        model: input.model,
        year: input.year,
        current_km: input.currentKm,
        status: input.status
      })
      .eq("id", busId)
      .eq("tenant_id", tenantId);
    throwIfError(error);
  }

  async listKmRecords(user: AppUser, filters: KmRecordFilters = {}): Promise<KmRecord[]> {
    let request = supabase
      .from("km_records")
      .select("*")
      .eq("tenant_id", user.tenantId)
      .order("record_date", { ascending: false });

    if (user.role === "driver") request = request.eq("driver_id", user.id);
    else if (filters.driverId) request = request.eq("driver_id", filters.driverId);
    if (filters.busId) request = request.eq("bus_id", filters.busId);
    if (filters.dateFrom) request = request.gte("record_date", filters.dateFrom.toISOString());
    if (filters.dateTo) request = request.lte("record_date", filters.dateTo.toISOString());

    const { data, error } = await request;
    throwIfError(error);
    return ((data ?? []) as KmRecordRow[]).map(mapKmRecord);
  }

  async createKmRecord(user: AppUser, input: KmRecordInput): Promise<string> {
    const totalKm = input.endKm - input.startKm;
    if (totalKm < 0) throw new Error("El kilometraje final debe ser mayor o igual al inicial.");

    const { data, error } = await supabase.rpc("create_km_record", {
      p_bus_id: input.busId,
      p_record_date: input.date.toISOString(),
      p_start_km: input.startKm,
      p_end_km: input.endKm,
      p_route: input.route ?? "",
      p_notes: input.notes ?? ""
    });
    throwIfError(error);
    return data as string;
  }

  async getMonthlyStats(tenantId: string, monthStart: Date): Promise<{ km: number; records: number }> {
    const { data, error } = await supabase
      .from("km_records")
      .select("total_km")
      .eq("tenant_id", tenantId)
      .gte("record_date", monthStart.toISOString());
    throwIfError(error);
    return ((data ?? []) as { total_km: number }[]).reduce(
      (acc, item) => {
        acc.records += 1;
        acc.km += item.total_km;
        return acc;
      },
      { km: 0, records: 0 }
    );
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    const { data, error } = await supabase.from("tenants").select("*").eq("id", tenantId).maybeSingle<TenantRow>();
    throwIfError(error);
    return data ? mapTenant(data) : null;
  }

  async updateTenant(tenantId: string, input: Pick<Tenant, "name" | "rut" | "address" | "contactEmail">): Promise<void> {
    const { error } = await supabase
      .from("tenants")
      .update({
        name: input.name,
        rut: input.rut ?? null,
        address: input.address ?? null,
        contact_email: input.contactEmail ?? null
      })
      .eq("id", tenantId);
    throwIfError(error);
  }
}
