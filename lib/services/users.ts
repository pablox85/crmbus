import { getAppRepository } from "@/lib/repositories";
import type { UserProfileInput } from "@/lib/repositories/types";
import type { AppUser, Role } from "@/lib/types";

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  return (await getAppRepository()).getUserProfile(uid);
}

export async function listUsers(tenantId: string): Promise<AppUser[]> {
  return (await getAppRepository()).listUsers(tenantId);
}

export async function createUserProfile(input: UserProfileInput): Promise<void> {
  return (await getAppRepository()).createUserProfile(input);
}

export async function updateUserRole(userId: string, input: { role: Role; active: boolean }): Promise<void> {
  return (await getAppRepository()).updateUserRole(userId, input);
}
