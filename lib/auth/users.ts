import type { Role } from "@/lib/domain/types";

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const DEMO_PASSWORD = "demo2026";

export const DEMO_USERS: DemoUser[] = [
  { id: "u_costos", email: "costos@demo.local", name: "Ana — Costos", role: "costos" },
  { id: "u_ingeniero", email: "ingeniero@demo.local", name: "Luis — Ingeniero", role: "ingeniero" },
  { id: "u_pagos", email: "pagos@demo.local", name: "Rosa — Pagos", role: "pagos" },
  { id: "u_recepcion", email: "recepcion@demo.local", name: "Jorge — Recepción", role: "recepcion" },
  { id: "u_contabilidad", email: "contabilidad@demo.local", name: "Marta — Contabilidad", role: "contabilidad" },
];

export function findUserByEmail(email: string): DemoUser | undefined {
  const n = email.trim().toLowerCase();
  return DEMO_USERS.find((u) => u.email.toLowerCase() === n);
}
