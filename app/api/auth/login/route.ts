import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  sessionCookieOptions,
} from "@/lib/auth/session-server";
import { asRole } from "@/lib/services/mappers";

export async function POST(request: Request) {
  try {
    const { email, password } = (await request.json()) as {
      email?: string;
      password?: string;
    };
    if (!email?.trim() || !password) {
      return NextResponse.json({ error: "Correo y contraseña requeridos." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

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
  } catch {
    return NextResponse.json({ error: "Error al iniciar sesión." }, { status: 500 });
  }
}
