import { NextResponse } from "next/server";
import { createSession, sessionCookieOptions } from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";
import type { User } from "@prisma/client";

export async function jsonLoginSuccess(user: Pick<User, "id" | "email" | "name" | "role">) {
  const token = await createSession(user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: asRole(user.role),
    },
  });
  response.cookies.set(sessionCookieOptions(token));
  return response;
}

export function loginErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);
  if (
    msg.includes("Unable to open the database") ||
    msg.includes("Error code 14") ||
    msg.includes("SQLite") ||
    msg.includes("PrismaClientInitializationError")
  ) {
    return "No hay base de datos disponible. En Vercel hace falta configurar DATABASE_URL y ejecutar migraciones; este ERP está pensado para servidor en la oficina.";
  }
  if (process.env.NODE_ENV === "development") {
    return `Error al iniciar sesión: ${msg}`;
  }
  return "Error al iniciar sesión.";
}
