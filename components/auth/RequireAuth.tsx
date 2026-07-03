"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { canAccessPath } from "@/lib/roles";
import { useAuth } from "@/components/auth/AuthProvider";
import { Loader } from "@/components/ui/Loader";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { authUser, user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!authUser || !user) {
      router.replace("/login");
      return;
    }

    if (!canAccessPath(user.role, pathname)) {
      router.replace(user.role === "driver" ? "/registro-km" : "/dashboard");
    }
  }, [authUser, loading, pathname, router, user]);

  if (loading || !authUser || !user || !canAccessPath(user.role, pathname)) {
    return <Loader label="Cargando sesión..." />;
  }

  return children;
}
