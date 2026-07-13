import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { canAccessPath } from "@/lib/roles";
import type { Role } from "@/lib/types";

const protectedRoutes = [
  "/dashboard",
  "/flota",
  "/registro-km",
  "/historial",
  "/usuarios",
  "/auditoria",
  "/configuracion"
];

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function safePathForRole(role: Role): string {
  return role === "driver" ? "/registro-km" : "/dashboard";
}

export async function proxy(request: NextRequest) {
  if (publicEnv.useDemoData) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return redirectTo(request, "/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .maybeSingle<{ role: Role; active: boolean }>();

  if (profileError || !profile?.active) {
    return redirectTo(request, "/login");
  }

  if (!canAccessPath(profile.role, request.nextUrl.pathname)) {
    return redirectTo(request, safePathForRole(profile.role));
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/flota",
    "/registro-km",
    "/historial",
    "/usuarios",
    "/auditoria",
    "/configuracion"
  ]
};
