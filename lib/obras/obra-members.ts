import type { Role } from "@/lib/domain/types";

/** ¿El ingeniero puede ver/actuar en esta obra? (miembro o creador). */
export function engineerCanAccessObra(input: {
  role: Role;
  userId: string;
  createdByUserId: string | null | undefined;
  memberUserIds: string[];
}): boolean {
  if (input.role !== "ingeniero") return true;
  if (input.createdByUserId && input.createdByUserId === input.userId) return true;
  return input.memberUserIds.includes(input.userId);
}

/** Valida IDs de ingenieros y asegura que el creador ingeniero quede en el equipo. */
export function resolveObraEngineerMemberIds(input: {
  engineerUserIds: string[] | undefined;
  creatorUserId: string;
  creatorRole: Role;
  engineerUsers: { id: string; role: string }[];
}): { ok: true; userIds: string[] } | { ok: false; error: string } {
  const validIds = new Set(
    input.engineerUsers.filter((u) => u.role === "ingeniero").map((u) => u.id)
  );
  const requested = [...new Set((input.engineerUserIds ?? []).filter(Boolean))];

  for (const id of requested) {
    if (!validIds.has(id)) {
      return { ok: false, error: "Uno o más ingenieros seleccionados no son válidos." };
    }
  }

  const ids = new Set(requested);
  if (input.creatorRole === "ingeniero") {
    ids.add(input.creatorUserId);
  }

  if (ids.size === 0) {
    return {
      ok: false,
      error: "Designa al menos un ingeniero involucrado en la obra.",
    };
  }

  return { ok: true, userIds: [...ids] };
}
