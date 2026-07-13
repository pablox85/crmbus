import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import type { Role } from "@/lib/types";

const roleUpdateSchema = z.object({
  role: z.enum(["admin", "supervisor", "driver", "readonly", "demo"]),
  active: z.boolean()
});

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function canManageRoleChange(actorRole: Role, currentTargetRole: Role, nextTargetRole: Role): boolean {
  if (actorRole === "admin") return true;
  if (actorRole !== "supervisor") return false;

  return (
    (currentTargetRole === "driver" || currentTargetRole === "readonly") &&
    (nextTargetRole === "driver" || nextTargetRole === "readonly")
  );
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  if (publicEnv.useDemoData) {
    return jsonError("La actualización server-side de roles no aplica en modo demo.", 400);
  }

  const { userId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = roleUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos de rol inválidos.", 400);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("No autenticado.", 401);
  }

  const { data: actorProfile, error: actorProfileError } = await supabase
    .from("profiles")
    .select("tenant_id, role, active")
    .eq("id", user.id)
    .maybeSingle<{ tenant_id: string; role: Role; active: boolean }>();

  if (actorProfileError || !actorProfile?.active) {
    return jsonError("Perfil inválido.", 403);
  }

  const { data: targetProfile, error: targetProfileError } = await supabase
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", userId)
    .maybeSingle<{ tenant_id: string; role: Role }>();

  if (targetProfileError) {
    return jsonError(targetProfileError.message, 400);
  }

  if (!targetProfile || targetProfile.tenant_id !== actorProfile.tenant_id) {
    return jsonError("Usuario no encontrado en este tenant.", 404);
  }

  if (!canManageRoleChange(actorProfile.role, targetProfile.role, parsed.data.role)) {
    return jsonError("No autorizado para asignar ese rol.", 403);
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      active: parsed.data.active
    })
    .eq("id", userId)
    .eq("tenant_id", actorProfile.tenant_id);

  if (updateError) {
    return jsonError(updateError.message, 400);
  }

  return NextResponse.json({ ok: true });
}
