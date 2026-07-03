"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BusFront,
  Gauge,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils/cn";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard" },
  { href: "/flota", label: "Flota", icon: BusFront, permission: "busesRead" },
  { href: "/registro-km", label: "Registro de kilómetros", icon: Gauge, permission: "kmCreate" },
  { href: "/historial", label: "Historial", icon: History, permission: "kmHistory" },
  { href: "/usuarios", label: "Usuarios", icon: Users, permission: "users" },
  { href: "/configuracion", label: "Configuración", icon: Settings, permission: "settings" }
] as const;

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const visibleItems = items.filter((item) => can(user?.role, item.permission) || (item.href === "/historial" && user?.role === "driver"));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
        <Button variant="ghost" className="w-10 px-0" onClick={() => setOpen((value) => !value)} aria-label="Abrir navegación">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-bold">CRMBus</span>
        <ThemeToggle />
      </header>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">CRMBus</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.displayName}</p>
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>
        </div>
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="secondary" onClick={logout} className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            Salir
          </Button>
        </div>
      </aside>

      {open ? <button className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar navegación" /> : null}

      <main className="p-4 lg:ml-72 lg:p-8">{children}</main>
    </div>
  );
}
