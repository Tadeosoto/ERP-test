import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessFleet } from "@/lib/flota/access";
import { parseDay, pricePerLiter } from "@/lib/flota/dates";
import { recomputeVehicleFuel } from "@/lib/flota/fuel-economy";
import { purgeExpiredFuelReceipts, saveFuelLoadFiles } from "@/lib/services/fuel-files";
import { mapVehicle, vehicleDetailSelect } from "@/app/api/vehicles/route";
import { destinationLabel } from "@/lib/tarjetas/summary";

function allow(user: { role: string; email: string }) {
  return canAccessFleet({ role: asRole(user.role), email: user.email });
}

function mapLoad(load: {
  id: string;
  occurredOn: Date;
  odometerKm: number;
  liters: number;
  amount: number;
  pricePerLiter: number;
  kmPerLiter: number | null;
  stationName: string;
  destinationKind: string;
  costCenter: string;
  receiptKind: string;
  notes: string;
  vehicle: { id: string; code: string; name: string };
  companyCard: { id: string; label: string };
  obra: { name: string } | null;
  files: { id: string; kind: string; originalFileName: string; purgedAt: Date | null; expiresAt: Date }[];
}) {
  return {
    id: load.id,
    vehicleId: load.vehicle.id,
    vehicleName: load.vehicle.code ? `${load.vehicle.code} · ${load.vehicle.name}` : load.vehicle.name,
    occurredOn: load.occurredOn.toISOString(),
    odometerKm: load.odometerKm,
    liters: load.liters,
    amount: load.amount,
    pricePerLiter: load.pricePerLiter,
    kmPerLiter: load.kmPerLiter,
    stationName: load.stationName,
    cardId: load.companyCard.id,
    cardLabel: load.companyCard.label,
    destinationLabel: destinationLabel({
      destinationKind: load.destinationKind,
      obraName: load.obra?.name,
      costCenter: load.costCenter,
    }),
    receiptKind: load.receiptKind,
    notes: load.notes,
    files: load.files.map((file) => ({
      id: file.id,
      kind: file.kind,
      originalFileName: file.originalFileName,
      purged: Boolean(file.purgedAt),
      expiresAt: file.expiresAt.toISOString(),
    })),
  };
}

const loadInclude = {
  vehicle: { select: { id: true, code: true, name: true } },
  companyCard: { select: { id: true, label: true } },
  obra: { select: { name: true } },
  files: { select: { id: true, kind: true, originalFileName: true, purgedAt: true, expiresAt: true } },
} as const;

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a combustible." }, { status: 403 });
    await purgeExpiredFuelReceipts();
    const vehicleId = new URL(request.url).searchParams.get("vehicleId");
    const rows = await prisma.fuelLoad.findMany({
      where: vehicleId ? { vehicleId } : undefined,
      include: loadInclude,
      orderBy: { occurredOn: "desc" },
    });
    return NextResponse.json({ loads: rows.map(mapLoad) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a combustible." }, { status: 403 });
    const form = await request.formData();
    const vehicleId = String(form.get("vehicleId") ?? "").trim();
    const companyCardId = String(form.get("companyCardId") ?? "").trim();
    const occurredOn = parseDay(form.get("occurredOn"));
    const odometerKm = Number(form.get("odometerKm"));
    const liters = Number(form.get("liters"));
    const amount = Number(form.get("amount"));
    const stationName = String(form.get("stationName") ?? "").trim();
    const destinationKind = String(form.get("destinationKind") ?? "");
    const obraId = String(form.get("obraId") ?? "").trim() || null;
    const costCenter = String(form.get("costCenter") ?? "").trim();
    const receiptKind = String(form.get("receiptKind") ?? "");
    const notes = String(form.get("notes") ?? "").trim();
    const unit = pricePerLiter(amount, liters);

    if (!vehicleId || !companyCardId || !occurredOn || !stationName) {
      return NextResponse.json({ error: "Fecha, vehículo, gasolinera y tarjeta son obligatorios." }, { status: 400 });
    }
    if (!(odometerKm >= 0) || !(liters > 0) || !(amount > 0) || unit == null) {
      return NextResponse.json({ error: "Kilometraje, litros e importe total son obligatorios." }, { status: 400 });
    }
    if (destinationKind !== "obra" && destinationKind !== "oficinas" && destinationKind !== "otro") {
      return NextResponse.json({ error: "Indica la obra o el centro de costo." }, { status: 400 });
    }
    if (destinationKind === "obra" && !obraId) return NextResponse.json({ error: "Elige la obra." }, { status: 400 });
    if (destinationKind === "otro" && !costCenter) return NextResponse.json({ error: "Escribe el centro de costo." }, { status: 400 });
    if (receiptKind !== "factura" && receiptKind !== "ticket" && receiptKind !== "sin_comprobante") {
      return NextResponse.json({ error: "Elige el tipo de comprobante." }, { status: 400 });
    }

    const [vehicle, card] = await Promise.all([
      prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { id: true, status: true } }),
      prisma.companyCard.findUnique({ where: { id: companyCardId }, select: { id: true } }),
    ]);
    if (!vehicle || vehicle.status !== "activo") return NextResponse.json({ error: "El vehículo no está activo." }, { status: 400 });
    if (!card) return NextResponse.json({ error: "Elige una tarjeta empresarial." }, { status: 400 });

    const uploads = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
    if ((receiptKind === "factura" || receiptKind === "ticket") && uploads.length === 0) {
      return NextResponse.json({ error: "Adjunta el comprobante de esta carga." }, { status: 400 });
    }

    const created = await prisma.fuelLoad.create({
      data: {
        vehicleId,
        companyCardId,
        occurredOn,
        odometerKm,
        liters,
        amount,
        pricePerLiter: unit,
        stationName,
        destinationKind,
        obraId: destinationKind === "obra" ? obraId : null,
        costCenter: destinationKind === "otro" ? costCenter : "",
        receiptKind,
        notes,
        createdByUserId: user.id,
      },
    });

    if (receiptKind === "factura" || receiptKind === "ticket") {
      try {
        await saveFuelLoadFiles({
          fuelLoadId: created.id,
          occurredOn,
          receiptKind,
          files: uploads,
          uploadedByUserId: user.id,
        });
      } catch (error) {
        await prisma.fuelLoad.delete({ where: { id: created.id } });
        const message = error instanceof Error ? error.message : "No se pudo guardar el comprobante.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    await recomputeVehicleFuel(vehicleId);
    const fresh = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: vehicleDetailSelect });
    return NextResponse.json({ vehicle: fresh ? mapVehicle(fresh) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
