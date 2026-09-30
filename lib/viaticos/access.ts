import type { Role } from "@/lib/domain/types";

/** Dirección, Administración (pagos), Contabilidad e Ingeniería. */
export function canAccessViaticos(role: Role): boolean {
  return role === "direccion" || role === "pagos" || role === "contabilidad" || role === "ingeniero";
}
