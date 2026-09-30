import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessFleet } from "@/lib/flota/access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessFleet({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { imageData: true, imageMime: true },
    });
    if (!vehicle?.imageData || vehicle.imageData.length === 0) {
      return NextResponse.json({ error: "Sin foto." }, { status: 404 });
    }
    const width = Math.min(1600, Math.max(48, Number(new URL(request.url).searchParams.get("w") ?? 800) || 800));
    const quality = Math.min(90, Math.max(40, Number(new URL(request.url).searchParams.get("q") ?? 75) || 75));
    const sharp = (await import("sharp")).default;
    const output = await sharp(Buffer.from(vehicle.imageData))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
