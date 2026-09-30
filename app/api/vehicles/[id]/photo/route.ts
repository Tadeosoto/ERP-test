import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessFleet } from "@/lib/flota/access";
import { mapVehicle, vehicleDetailSelect } from "@/app/api/vehicles/route";
import { prepareVehicleImage } from "@/lib/flota/vehicle-image";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!canAccessFleet({ role: asRole(user.role), email: user.email })) {
      return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const existing = await prisma.vehicle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.size <= 0 || !image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Elige una imagen del vehículo." }, { status: 400 });
    }
    if (image.size > 8 * 1024 * 1024) return NextResponse.json({ error: "La foto supera 8 MB." }, { status: 400 });
    const prepared = await prepareVehicleImage(image);
    const row = await prisma.vehicle.update({
      where: { id },
      data: { imageData: prepared.data, imageMime: prepared.mime },
      select: vehicleDetailSelect,
    });
    return NextResponse.json({ vehicle: mapVehicle(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
