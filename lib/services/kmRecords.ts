import { getAppRepository } from "@/lib/repositories";
import type { KmRecordFilters, KmRecordInput } from "@/lib/repositories/types";
import type { AppUser, KmRecord } from "@/lib/types";

export type { KmRecordFilters } from "@/lib/repositories/types";

export async function listKmRecords(user: AppUser, filters: KmRecordFilters = {}): Promise<KmRecord[]> {
  return (await getAppRepository()).listKmRecords(user, filters);
}

export async function createKmRecord(user: AppUser, input: KmRecordInput): Promise<string> {
  return (await getAppRepository()).createKmRecord(user, input);
}

export async function getMonthlyStats(tenantId: string, monthStart: Date): Promise<{ km: number; records: number }> {
  return (await getAppRepository()).getMonthlyStats(tenantId, monthStart);
}
