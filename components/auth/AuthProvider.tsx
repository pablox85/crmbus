"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginWithEmail, logoutAuth, observeAuthState, type AuthUser } from "@/lib/services/auth";
import { getUserProfile } from "@/lib/services/users";
import type { AppUser } from "@/lib/types";

interface AuthContextValue {
  authUser: AuthUser | null;
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadProfile = async (currentUser: AuthUser | null) => {
    if (!currentUser) {
      setUser(null);
      return;
    }

    const profile = await getUserProfile(currentUser.uid);
    setUser(profile?.active === false ? null : profile);
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribe = () => {};

    void observeAuthState((currentUser) => {
      void (async () => {
        if (!mounted) return;
        setLoading(true);
        setAuthUser(currentUser);
        await loadProfile(currentUser);
        if (mounted) setLoading(false);
      })();
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      user,
      loading,
      login: async (email, password) => {
        const loggedUser = await loginWithEmail(email, password);
        setAuthUser(loggedUser);
        await loadProfile(loggedUser);
        router.push("/dashboard");
      },
      logout: async () => {
        await logoutAuth();
        setAuthUser(null);
        setUser(null);
        router.push("/login");
      },
      refreshUser: async () => loadProfile(authUser)
    }),
    [authUser, loading, router, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return context;
}
