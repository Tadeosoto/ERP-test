import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { jsonLoginSuccess, loginErrorMessage } from "@/lib/auth/build-login-response";

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

    return jsonLoginSuccess(user);
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: loginErrorMessage(error) }, { status: 500 });
  }
}
