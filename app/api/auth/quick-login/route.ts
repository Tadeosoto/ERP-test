import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonLoginSuccess, loginErrorMessage } from "@/lib/auth/build-login-response";
import { isAllowedQuickEmail, isQuickLoginEnabled } from "@/lib/auth/quick-login";

export async function POST(request: Request) {
  try {
    if (!isQuickLoginEnabled()) {
      return NextResponse.json(
        { error: "Acceso rápido desactivado en este servidor." },
        { status: 403 }
      );
    }

    const { email } = (await request.json()) as { email?: string };
    if (!email?.trim()) {
      return NextResponse.json({ error: "Correo requerido." }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    if (!isAllowedQuickEmail(normalized)) {
      return NextResponse.json({ error: "Usuario no permitido para acceso rápido." }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Usuario no encontrado en la base de datos. Ejecute npm run db:seed en el servidor (o configure la BD en Vercel).",
        },
        { status: 404 }
      );
    }

    return jsonLoginSuccess(user);
  } catch (error) {
    console.error("[quick-login]", error);
    return NextResponse.json({ error: loginErrorMessage(error) }, { status: 500 });
  }
}
