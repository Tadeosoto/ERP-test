import { RoleActivityIcon } from "@/components/dashboard/role-activity-icon";
import { ROLE_ACTIVITY_STYLE } from "@/lib/dashboard/role-activity-style";
import type { Role } from "@/lib/domain/types";

const ROLES: Role[] = ["compras", "ingeniero", "pagos", "recepcion", "contabilidad"];

export function RoleLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-4 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Áreas del proceso</p>
      <div className="mt-3 flex flex-wrap gap-3">
        {ROLES.map((role) => (
          <span
            key={role}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-100 bg-zinc-50/80 px-3 py-1.5 text-sm font-medium text-zinc-800"
          >
            <RoleActivityIcon role={role} size="sm" />
            {ROLE_ACTIVITY_STYLE[role].label}
          </span>
        ))}
      </div>
    </div>
  );
}
