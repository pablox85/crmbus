import { getAppRepository } from "@/lib/repositories";
import type { UserProfileInput } from "@/lib/repositories/types";
import { publicEnv } from "@/lib/env";
import type { AppUser, Role } from "@/lib/types";

export interface ManualUserInput {
  tenantId: string;
  displayName: string;
  email: string;
  password: string;
  role: Role;
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  return (await getAppRepository()).getUserProfile(uid);
}

export async function listUsers(tenantId: string): Promise<AppUser[]> {
  return (await getAppRepository()).listUsers(tenantId);
}

export async function createUserProfile(input: UserProfileInput): Promise<void> {
  return (await getAppRepository()).createUserProfile(input);
}

export async function createManualUser(input: ManualUserInput): Promise<void> {
  if (publicEnv.useDemoData) {
    await createUserProfile({
      uid: `demo-manual-${Date.now()}`,
      tenantId: input.tenantId,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      active: true
    });
    return;
  }

  const response = await fetch("/api/users/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "No se pudo crear el usuario manual.");
  }
}

export async function updateUserRole(userId: string, input: { role: Role; active: boolean }): Promise<void> {
  if (!publicEnv.useDemoData) {
    const response = await fetch(`/api/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "No se pudo actualizar el rol del usuario.");
    }

    return;
  }

  return (await getAppRepository()).updateUserRole(userId, input);
}

export async function inviteUser(tenantId: string, email: string, displayName: string, role: Role): Promise<void> {
  if (publicEnv.useDemoData) {
    await createUserProfile({
      uid: `demo-invite-${Date.now()}`,
      tenantId,
      email,
      displayName,
      role,
      active: true
    });
    return;
  }

  const response = await fetch("/api/users/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId, email, displayName, role })
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "No se pudo invitar al usuario.");
  }
}
