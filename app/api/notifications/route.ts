import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { mapNotification } from "@/lib/services/mappers";
import { ensureRecurringDueReminders } from "@/lib/services/recurring-due-reminders";
import { apiErrorResponse } from "@/lib/api/handle-route-error";

export async function GET() {
  try {
    const user = await requireSessionUser();

    if (user.role === "pagos") {
      await ensureRecurringDueReminders();
    }

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
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      ids?: string[];
    };

    if (body.action === "acknowledge") {
      const where =
        body.ids && body.ids.length > 0
          ? {
              userId: user.id,
              id: { in: body.ids },
              requiresAcknowledgement: true,
            }
          : {
              userId: user.id,
              requiresAcknowledgement: true,
              acknowledged: false,
            };

      await prisma.notification.updateMany({
        where,
        data: {
          acknowledged: true,
          read: true,
        },
      });
      return NextResponse.json({ ok: true });
    }

    // Marcar leídas no cierra avisos que requieren «Enterado».
    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
        OR: [{ requiresAcknowledgement: false }, { acknowledged: true }],
      },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
