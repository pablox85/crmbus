import type { Role } from "@/lib/types";

export const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  driver: "Chofer",
  readonly: "Solo Lectura",
  demo: "Demo"
};

const permissions: Record<string, readonly Role[]> = {
  dashboard: ["admin", "supervisor", "readonly", "demo"],
  busesRead: ["admin", "supervisor", "readonly", "demo"],
  busesWrite: ["admin", "demo"],
  kmCreate: ["admin", "supervisor", "driver", "demo"],
  kmHistory: ["admin", "supervisor", "readonly", "demo"],
  ownKmHistory: ["driver"],
  users: ["admin", "demo"],
  settings: ["admin", "demo"]
};

export type Permission = keyof typeof permissions;

export function can(role: Role | undefined, permission: Permission): boolean {
  return Boolean(role && permissions[permission].includes(role));
}

export function canAccessPath(role: Role | undefined, path: string): boolean {
  if (!role) return false;
  if (path.startsWith("/dashboard")) return can(role, "dashboard");
  if (path.startsWith("/flota")) return can(role, "busesRead");
  if (path.startsWith("/registro-km")) return can(role, "kmCreate");
  if (path.startsWith("/historial")) return can(role, "kmHistory") || can(role, "ownKmHistory");
  if (path.startsWith("/usuarios")) return can(role, "users");
  if (path.startsWith("/configuracion")) return can(role, "settings");
  return true;
}
