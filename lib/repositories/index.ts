import { SupabaseAuthRepository, SupabaseRepository } from "@/lib/repositories/SupabaseRepository";
import type { AppRepository, AuthRepository } from "@/lib/repositories/types";

const useDemoData = process.env.NEXT_PUBLIC_USE_DEMO_DATA === "true";

let appRepositoryPromise: Promise<AppRepository> | null = null;
let authRepositoryPromise: Promise<AuthRepository> | null = null;

async function loadDemoRepositories(): Promise<{ appRepository: AppRepository; authRepository: AuthRepository }> {
  // DEMO_ONLY
  // REMOVE_BEFORE_PRODUCTION
  const modulePath = "@/src/demo/repository";
  const demoModule = (await import(modulePath)) as {
    createDemoRepositories: () => { appRepository: AppRepository; authRepository: AuthRepository };
  };
  return demoModule.createDemoRepositories();
}

export async function getAppRepository(): Promise<AppRepository> {
  if (!appRepositoryPromise) {
    appRepositoryPromise = useDemoData
      ? loadDemoRepositories().then((repositories) => repositories.appRepository)
      : Promise.resolve(new SupabaseRepository());
  }
  return appRepositoryPromise;
}

export async function getAuthRepository(): Promise<AuthRepository> {
  if (!authRepositoryPromise) {
    authRepositoryPromise = useDemoData
      ? loadDemoRepositories().then((repositories) => repositories.authRepository)
      : Promise.resolve(new SupabaseAuthRepository());
  }
  return authRepositoryPromise;
}
