import type { Role } from "@/lib/domain/types";

/** Socio ingeniero con acceso a tarjetas. El resto de Ingeniería no entra. */
const PARTNER_ENGINEER_EMAIL = "daniel.arellano@ccp.local";

export function canAccessCompanyCards(user: { role: Role; email: string }): boolean {
  if (user.role === "direccion" || user.role === "pagos" || user.role === "contabilidad") return true;
  return user.email.trim().toLowerCase() === PARTNER_ENGINEER_EMAIL;
}

/** Carolina (Administración) registra los últimos 4 dígitos. */
export function canEditCardDigits(user: { role: Role }): boolean {
  return user.role === "pagos";
}
