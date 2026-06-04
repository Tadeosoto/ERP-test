/** Correos del seed — solo estos pueden usar acceso rápido sin contraseña. */
export const QUICK_LOGIN_EMAILS = [
  "carolina@ccp.local",
  "paty@ccp.local",
  "santiago@ccp.local",
  "recepcion@ccp.local",
  "helena@ccp.local",
] as const;

export type QuickLoginEmail = (typeof QUICK_LOGIN_EMAILS)[number];

export function isQuickLoginEnabled(): boolean {
  return process.env.ALLOW_QUICK_LOGIN !== "false";
}

export function isAllowedQuickEmail(email: string): email is QuickLoginEmail {
  const normalized = email.trim().toLowerCase();
  return (QUICK_LOGIN_EMAILS as readonly string[]).includes(normalized);
}
