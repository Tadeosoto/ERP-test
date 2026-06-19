import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

const FRIENDLY: Record<string, string> = {
  UNAUTHORIZED: "Debes iniciar sesión para continuar.",
};

/** Convierte errores técnicos en mensajes cortos para la UI. */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof Error && FRIENDLY[error.message]) {
    return FRIENDLY[error.message];
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    if (error.message.includes("Unknown argument")) {
      return "La base de datos no está sincronizada con la app. En la carpeta del proyecto ejecute: npm run db:sync y reinicie el servidor (npm run dev).";
    }
    return "Datos inválidos para guardar. Revise los campos e intente de nuevo.";
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "Ya existe un registro con esos datos.";
      case "P2003":
        return "Referencia inválida (obra o usuario no encontrado).";
      case "P2025":
        return "El registro ya no existe.";
      default:
        return "No se pudo completar la operación en la base de datos.";
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return "No se pudo conectar a la base de datos. Verifique que el servidor esté configurado.";
  }

  if (error instanceof Error) {
    if (error.message.includes("Cannot read properties of undefined") && error.message.includes("'create'")) {
      return "La base de datos no está sincronizada con la app. En la carpeta ccp-erp-app ejecute: npm run db:fix-client y reinicie el servidor (npm run dev).";
    }
    // Errores de negocio (throws desde transitions, etc.)
    if (error.message.length < 200 && !error.message.includes("invocation")) {
      return error.message;
    }
  }

  return "Ocurrió un error inesperado. Intente de nuevo o contacte soporte.";
}

export function apiErrorResponse(
  error: unknown,
  fallbackStatus = 500
): NextResponse<{ error: string }> {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: FRIENDLY.UNAUTHORIZED }, { status: 401 });
  }

  const message = apiErrorMessage(error);
  const status =
    error instanceof Prisma.PrismaClientValidationError ? 503
    : error instanceof Error && error.message.length < 200 && !error.message.includes("invocation") ?
      400
    : fallbackStatus;

  if (process.env.NODE_ENV === "development") {
    console.error("[API]", error);
  }

  return NextResponse.json({ error: message }, { status });
}
