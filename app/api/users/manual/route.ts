import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import type { Role } from "@/lib/types";

const manualUserSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
  role: z.enum(["admin", "supervisor", "driver", "readonly", "demo"])
});

function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY.");
  return key;
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function canCreateRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "admin") return true;
  if (actorRole === "supervisor") return targetRole === "driver" || targetRole === "readonly";
  return false;
}

export async function POST(request: Request) {
  if (publicEnv.useDemoData) {
    return jsonError("El alta manual server-side no aplica en modo demo.", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = manualUserSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Datos de usuario inválidos.", 400);
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id, role, active")
    .eq("id", user.id)
    .maybeSingle<{ tenant_id: string; role: Role; active: boolean }>();

  if (profileError || !profile?.active) {
    return jsonError("Perfil inválido.", 403);
  }

  if (profile.tenant_id !== parsed.data.tenantId || !canCreateRole(profile.role, parsed.data.role)) {
    return jsonError("No autorizado.", 403);
  }

  const admin = createClient(publicEnv.supabaseUrl, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      tenant_id: parsed.data.tenantId,
      display_name: parsed.data.displayName,
      role: parsed.data.role
    }
  });

  if (createError || !created.user) {
    return jsonError(createError?.message ?? "No se pudo crear el usuario Auth.", 400);
  }

  const { error: profileUpsertError } = await admin.from("profiles").upsert({
    id: created.user.id,
    tenant_id: parsed.data.tenantId,
    display_name: parsed.data.displayName,
    email: parsed.data.email,
    role: parsed.data.role,
    active: true
  });

  if (profileUpsertError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return jsonError(profileUpsertError.message, 400);
  }

  return NextResponse.json({ ok: true, userId: created.user.id });
}
