import { getAppRepository } from "@/lib/repositories";
import type { AuditLogFilters } from "@/lib/repositories/types";
import type { AuditLogEntry } from "@/lib/types";

export type { AuditLogFilters } from "@/lib/repositories/types";

export async function listAuditLog(tenantId: string, filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
  return (await getAppRepository()).listAuditLog(tenantId, filters);
}
