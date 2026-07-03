import { getAuthRepository } from "@/lib/repositories";
import type { AuthUser } from "@/lib/repositories/types";

export type { AuthUser } from "@/lib/repositories/types";

export async function observeAuthState(callback: (user: AuthUser | null) => void): Promise<() => void> {
  return (await getAuthRepository()).onAuthStateChanged(callback);
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  return (await getAuthRepository()).signIn(email, password);
}

export async function logoutAuth(): Promise<void> {
  return (await getAuthRepository()).signOut();
}
