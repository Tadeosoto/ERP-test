import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { asRole } from "@/lib/services/mappers";
import { canAccessFleet, canEditVehicleProfile } from "@/lib/flota/access";
import { parseDay } from "@/lib/flota/dates";
import { mapVehicle, vehicleDetailSelect } from "@/app/api/vehicles/route";

type Ctx = { params: Promise<{ id: string }> };

function allow(user: { role: string; email: string }) {
  return canAccessFleet({ role: asRole(user.role), email: user.email });
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    const { id } = await ctx.params;
    const row = await prisma.vehicle.findUnique({ where: { id }, select: vehicleDetailSelect });
    if (!row) return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
    return NextResponse.json({ vehicle: mapVehicle(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    if (!canEditVehicleProfile(user)) {
      return NextResponse.json({ error: "Solo Carolina puede editar los datos del vehículo." }, { status: 403 });
    }
    const { id } = await ctx.params;
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? existing.name).trim();
    if (!name) return NextResponse.json({ error: "El nombre del vehículo es obligatorio." }, { status: 400 });
    const year = body.year == null || body.year === "" ? null : Number(body.year);
    const row = await prisma.vehicle.update({
      where: { id },
      data: {
        code: String(body.code ?? existing.code).trim(),
        name,
        year: year != null && Number.isFinite(year) ? year : null,
        plates: String(body.plates ?? existing.plates).trim().toUpperCase(),
        vehicleType: String(body.vehicleType ?? existing.vehicleType).trim(),
        color: String(body.color ?? existing.color).trim(),
        vin: String(body.vin ?? existing.vin).trim(),
        engineNumber: String(body.engineNumber ?? existing.engineNumber).trim(),
        ownerName: String(body.ownerName ?? existing.ownerName).trim(),
        currentKm:
          body.currentKm == null || body.currentKm === ""
            ? existing.currentKm
            : Math.max(0, Number(body.currentKm) || 0),
        status: body.status === "baja" ? "baja" : "activo",
        notes: String(body.notes ?? existing.notes).trim(),
      },
      select: vehicleDetailSelect,
    });
    return NextResponse.json({ vehicle: mapVehicle(row) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    const { id } = await ctx.params;
    const vehicle = await prisma.vehicle.findUnique({ where: { id }, include: { financing: true } });
    if (!vehicle) return NextResponse.json({ error: "Vehículo no encontrado." }, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");

    if (action === "document") {
      const kind = String(body.kind ?? "").trim();
      const name = String(body.name ?? "").trim();
      if (!kind || !name) return NextResponse.json({ error: "Tipo y nombre del documento son obligatorios." }, { status: 400 });
      await prisma.vehicleDocument.create({
        data: { vehicleId: id, kind, name, expiresOn: parseDay(body.expiresOn) },
      });
    } else if (action === "maintenance") {
      const title = String(body.title ?? "").trim();
      if (!title) return NextResponse.json({ error: "El servicio es obligatorio." }, { status: 400 });
      const dueKm = body.dueKm == null || body.dueKm === "" ? null : Number(body.dueKm);
      await prisma.vehicleMaintenance.create({
        data: {
          vehicleId: id,
          title,
          dueOn: parseDay(body.dueOn),
          dueKm: dueKm != null && Number.isFinite(dueKm) ? dueKm : null,
          notes: String(body.notes ?? "").trim(),
        },
      });
    } else if (action === "complete-maintenance") {
      await prisma.vehicleMaintenance.update({
        where: { id: String(body.maintenanceId) },
        data: { completedOn: parseDay(body.completedOn) ?? new Date() },
      });
    } else if (action === "financing") {
      const institution = String(body.institution ?? "").trim();
      const monthlyPayment = Number(body.monthlyPayment);
      const balance = Number(body.balance);
      const termMonths = Number(body.termMonths);
      if (!institution || !(monthlyPayment > 0) || !(termMonths > 0)) {
        return NextResponse.json({ error: "Institución, plazo y pago mensual son obligatorios." }, { status: 400 });
      }
      const data = {
        kind: body.kind === "arrendamiento" ? "arrendamiento" : "credito",
        institution,
        termMonths,
        monthlyPayment,
        balance: Number.isFinite(balance) ? balance : 0,
        nextPaymentOn: parseDay(body.nextPaymentOn),
        notes: String(body.notes ?? "").trim(),
      };
      if (vehicle.financing) {
        await prisma.vehicleFinancing.update({ where: { vehicleId: id }, data });
      } else {
        await prisma.vehicleFinancing.create({ data: { vehicleId: id, ...data } });
      }
    } else if (action === "payment") {
      if (!vehicle.financing) return NextResponse.json({ error: "Este vehículo no tiene financiamiento." }, { status: 400 });
      const amount = Number(body.amount);
      const paidOn = parseDay(body.paidOn);
      if (!paidOn || !(amount > 0)) return NextResponse.json({ error: "Fecha y monto del pago son obligatorios." }, { status: 400 });
      await prisma.vehicleFinancingPayment.create({
        data: { financingId: vehicle.financing.id, paidOn, amount, notes: String(body.notes ?? "").trim() },
      });
      await prisma.vehicleFinancing.update({
        where: { id: vehicle.financing.id },
        data: { balance: Math.max(0, Math.round((vehicle.financing.balance - amount) * 100) / 100) },
      });
    } else if (action === "expense") {
      const concept = String(body.concept ?? "").trim();
      const amount = Number(body.amount);
      const occurredOn = parseDay(body.occurredOn);
      if (!concept || !occurredOn || !(amount > 0)) {
        return NextResponse.json({ error: "Fecha, concepto y monto son obligatorios." }, { status: 400 });
      }
      await prisma.vehicleExpense.create({
        data: { vehicleId: id, concept, amount, occurredOn, notes: String(body.notes ?? "").trim() },
      });
    } else {
      return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
    }

    const row = await prisma.vehicle.findUnique({ where: { id }, select: vehicleDetailSelect });
    return NextResponse.json({ vehicle: row ? mapVehicle(row) : null });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
