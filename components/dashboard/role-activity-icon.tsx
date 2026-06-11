import { ROLE_ACTIVITY_STYLE, type RoleActivityIconName } from "@/lib/dashboard/role-activity-style";
import type { Role } from "@/lib/domain/types";

function IconGlyph({ name }: { name: RoleActivityIconName }) {
  const cls = "h-4 w-4";
  if (name === "wallet") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
        />
      </svg>
    );
  }
  if (name === "hardhat") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 13c0-4.42 3.58-8 8-8s8 3.58 8 8v3H4v-3z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16h16" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5V3.5" />
      </svg>
    );
  }
  if (name === "inbox") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    );
  }
  if (name === "calculator") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export function RoleActivityIcon({ role, size = "md" }: { role: Role; size?: "sm" | "md" }) {
  const style = ROLE_ACTIVITY_STYLE[role];
  const box = size === "sm" ? "h-9 w-9 rounded-xl" : "h-10 w-10 rounded-xl";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ring-1 ${box} ${style.bg} ${style.ring}`}
      title={style.label}
    >
      <IconGlyph name={style.icon} />
    </span>
  );
}
