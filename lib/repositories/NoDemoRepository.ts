import type { AppRepository, AuthRepository } from "@/lib/repositories/types";

export function createDemoRepositories(): { appRepository: AppRepository; authRepository: AuthRepository } {
  throw new Error("Demo data is disabled. Set NEXT_PUBLIC_USE_DEMO_DATA=true to use src/demo.");
}
