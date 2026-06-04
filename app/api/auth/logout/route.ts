import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  clearSessionCookieOptions,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/auth/session-server";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSessionCookieOptions());
  return response;
}
