import { getAppRepository } from "@/lib/repositories";
import type { BusInput } from "@/lib/repositories/types";
import type { Bus } from "@/lib/types";

export async function listBuses(tenantId: string): Promise<Bus[]> {
  return (await getAppRepository()).listBuses(tenantId);
}

export async function createBus(tenantId: string, input: BusInput): Promise<string> {
  return (await getAppRepository()).createBus(tenantId, input);
}

export async function updateBus(
  busId: string,
  tenantId: string,
  input: Partial<Omit<Bus, "id" | "tenantId" | "createdAt" | "updatedAt">>
): Promise<void> {
  return (await getAppRepository()).updateBus(busId, tenantId, input);
}
