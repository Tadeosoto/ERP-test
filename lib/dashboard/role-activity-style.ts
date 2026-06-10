import type { Role } from "@/lib/domain/types";

export type RoleActivityIconName = "document" | "wallet" | "hardhat" | "inbox";

export const ROLE_ACTIVITY_STYLE: Record<
  Role,
  { bg: string; ring: string; icon: RoleActivityIconName; label: string }
> = {
  compras: {
    bg: "bg-blue-100 text-blue-800",
    ring: "ring-blue-200/80",
    icon: "document",
    label: "Compras",
  },
  pagos: {
    bg: "bg-orange-100 text-orange-800",
    ring: "ring-orange-200/80",
    icon: "wallet",
    label: "Administración",
  },
  ingeniero: {
    bg: "bg-emerald-100 text-emerald-800",
    ring: "ring-emerald-200/80",
    icon: "hardhat",
    label: "Ingeniero",
  },
  recepcion: {
    bg: "bg-violet-100 text-violet-800",
    ring: "ring-violet-200/80",
    icon: "inbox",
    label: "Recepción",
  },
  contabilidad: {
    bg: "bg-purple-100 text-purple-800",
    ring: "ring-purple-200/80",
    icon: "document",
    label: "Contabilidad",
  },
};

export function roleActivityLabel(role: Role, actorName: string): string {
  return `${actorName} (${ROLE_ACTIVITY_STYLE[role].label})`;
}
