import { getAppRepository } from "@/lib/repositories";
import type { Tenant } from "@/lib/types";

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  return (await getAppRepository()).getTenant(tenantId);
}

export async function updateTenant(
  tenantId: string,
  input: Pick<Tenant, "name" | "rut" | "address" | "contactEmail">
): Promise<void> {
  return (await getAppRepository()).updateTenant(tenantId, input);
}
