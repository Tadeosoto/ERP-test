import type { Role } from "./types";

/** Todos los roles autenticados pueden consultar expedientes. */
export function canViewExpedientes(_role: Role): boolean {
  return true;
}

/** Solo Administración (Carolina) y Dirección (Diomedes) editan expedientes. */
export function canEditExpedientes(role: Role): boolean {
  return role === "pagos" || role === "direccion";
}

export function canCreateExpedientes(role: Role): boolean {
  return canEditExpedientes(role);
}

export function canDeleteExpedientes(role: Role): boolean {
  return canEditExpedientes(role);
}
