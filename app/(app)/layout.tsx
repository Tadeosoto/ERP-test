import { DashboardShell } from "@/components/dashboard-shell";
import { SessionGate } from "@/components/session-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <DashboardShell>{children}</DashboardShell>
    </SessionGate>
  );
}
