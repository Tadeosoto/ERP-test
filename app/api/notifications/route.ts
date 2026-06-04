import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { mapNotification } from "@/lib/services/mappers";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    return NextResponse.json({
      notifications: notifications.map(mapNotification),
      unreadCount,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al listar notificaciones." }, { status: 500 });
  }
}

export async function POST() {
  try {
    const user = await requireSessionUser();
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error al marcar notificaciones." }, { status: 500 });
  }
}
