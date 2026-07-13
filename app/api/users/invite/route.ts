import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { publicEnv } from "@/lib/env";
import type { Role } from "@/lib/types";

const inviteSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
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

function canInviteRole(actorRole: Role, invitedRole: Role): boolean {
  if (actorRole === "admin") return true;
  if (actorRole === "supervisor") return invitedRole === "driver" || invitedRole === "readonly";
  return false;
}

export async function POST(request: Request) {
  if (publicEnv.useDemoData) {
    return jsonError("La invitación por Supabase no aplica en modo demo.", 400);
  }

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Datos de invitación inválidos.", 400);
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

  if (profile.tenant_id !== parsed.data.tenantId || !canInviteRole(profile.role, parsed.data.role)) {
    return jsonError("No autorizado.", 403);
  }

  const admin = createClient(publicEnv.supabaseUrl, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      tenant_id: parsed.data.tenantId,
      display_name: parsed.data.displayName,
      role: parsed.data.role
    }
  });

  if (error) {
    return jsonError(error.message, 400);
  }

  return NextResponse.json({ ok: true });
}
