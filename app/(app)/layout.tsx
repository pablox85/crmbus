import { RequireAuth } from "@/components/auth/RequireAuth";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Sidebar>{children}</Sidebar>
    </RequireAuth>
  );
}
