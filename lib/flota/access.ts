import type { Role } from "@/lib/domain/types";

const PARTNER_ENGINEER_EMAIL = "daniel.arellano@ccp.local";
const CAROLINA_EMAIL = "carolina@ccp.local";

/** Solo Carolina puede corregir la ficha de un vehículo ya registrado. */
export function canEditVehicleProfile(user: { email: string }): boolean {
  return user.email.trim().toLowerCase() === CAROLINA_EMAIL;
}

/** Dirección, Administración, Contabilidad, Recepción y Daniel. */
export function canAccessFleet(user: { role: Role; email: string }): boolean {
  if (
    user.role === "direccion" ||
    user.role === "pagos" ||
    user.role === "contabilidad" ||
    user.role === "recepcion"
  ) {
    return true;
  }
  return user.email.trim().toLowerCase() === PARTNER_ENGINEER_EMAIL;
}
