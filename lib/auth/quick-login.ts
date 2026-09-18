import { DEMO_USER_EMAILS, type DemoUserEmail } from "@/lib/auth/demo-users";

/** Correos del seed — solo estos pueden usar acceso rápido sin contraseña. */
export const QUICK_LOGIN_EMAILS = DEMO_USER_EMAILS;

export type QuickLoginEmail = DemoUserEmail;

export function isQuickLoginEnabled(): boolean {
  return process.env.ALLOW_QUICK_LOGIN !== "false";
}

export function isAllowedQuickEmail(email: string): email is QuickLoginEmail {
  const normalized = email.trim().toLowerCase();
  return (QUICK_LOGIN_EMAILS as readonly string[]).includes(normalized);
}
