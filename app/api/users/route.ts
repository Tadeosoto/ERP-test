import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const users = await prisma.user.findMany({
      where: role ? { role } : undefined,
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ users });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
