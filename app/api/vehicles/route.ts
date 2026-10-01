import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth/session-server";
import { apiErrorResponse } from "@/lib/api/handle-route-error";
import { prepareVehicleImage } from "@/lib/flota/vehicle-image";
import { asRole } from "@/lib/services/mappers";
import { canAccessFleet } from "@/lib/flota/access";
import { documentTone, mexicoDay, parseDay, pricePerLiter, sameMonth, sameYear } from "@/lib/flota/dates";
import { financingProgress } from "@/lib/flota/financing";
import { purgeExpiredFuelReceipts } from "@/lib/services/fuel-files";

function allow(user: { role: string; email: string }) {
  return canAccessFleet({ role: asRole(user.role), email: user.email });
}

const fuelFileSelect = {
  id: true,
  kind: true,
  originalFileName: true,
  mimeType: true,
  purgedAt: true,
  expiresAt: true,
} as const;

export const vehicleDetailSelect = {
  id: true,
  code: true,
  name: true,
  year: true,
  plates: true,
  vehicleType: true,
  color: true,
  vin: true,
  engineNumber: true,
  ownerName: true,
  status: true,
  currentKm: true,
  notes: true,
  imageMime: true,
  createdAt: true,
  responsibleUser: { select: { id: true, name: true } },
  obra: { select: { id: true, name: true } },
  documents: { orderBy: { expiresOn: "asc" as const } },
  maintenances: { orderBy: { createdAt: "desc" as const } },
  financing: { include: { payments: { orderBy: { paidOn: "desc" as const } } } },
  expenses: { orderBy: { occurredOn: "desc" as const } },
  fuelLoads: {
    orderBy: { occurredOn: "desc" as const },
    include: {
      companyCard: { select: { id: true, label: true } },
      obra: { select: { id: true, name: true } },
      files: { select: fuelFileSelect },
    },
  },
};

export function mapVehicle(row: {
  id: string;
  code: string;
  name: string;
  year: number | null;
  plates: string;
  vehicleType: string;
  color: string;
  vin: string;
  engineNumber: string;
  ownerName: string;
  status: string;
  currentKm: number;
  notes: string;
  imageMime: string;
  createdAt: Date;
  responsibleUser: { id: string; name: string } | null;
  obra: { id: string; name: string } | null;
  documents: { id: string; kind: string; name: string; expiresOn: Date | null }[];
  maintenances: { id: string; title: string; dueOn: Date | null; dueKm: number | null; completedOn: Date | null; notes: string }[];
  financing: {
    id: string;
    kind: string;
    institution: string;
    termMonths: number;
    monthlyPayment: number;
    paidInstallments: number;
    balance: number;
    nextPaymentOn: Date | null;
    notes: string;
    payments: { id: string; paidOn: Date; amount: number; notes: string }[];
  } | null;
  expenses: { id: string; occurredOn: Date; concept: string; amount: number; notes: string }[];
  fuelLoads: {
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
    companyCard: { id: string; label: string };
    obra: { id: string; name: string } | null;
    files: { id: string; kind: string; originalFileName: string; mimeType: string; purgedAt: Date | null; expiresAt: Date }[];
  }[];
}) {
  const today = mexicoDay();
  const now = new Date();
  const loads = row.fuelLoads;
  const monthLoads = loads.filter((load) => sameMonth(load.occurredOn, now));
  const yearLoads = loads.filter((load) => sameYear(load.occurredOn, now));
  const sum = (items: { amount: number }[]) => items.reduce((total, item) => total + item.amount, 0);
  const liters = (items: { liters: number }[]) => items.reduce((total, item) => total + item.liters, 0);
  const efficiencies = loads.map((load) => load.kmPerLiter).filter((value): value is number => value != null && value > 0);
  const documents = row.documents.map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    name: doc.name,
    expiresOn: doc.expiresOn?.toISOString() ?? null,
    tone: documentTone(doc.expiresOn, today),
  }));
  const toneOf = (kind: string) => documents.find((doc) => doc.kind === kind)?.tone ?? "sin_fecha";
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    year: row.year,
    plates: row.plates,
    vehicleType: row.vehicleType,
    color: row.color,
    vin: row.vin,
    engineNumber: row.engineNumber,
    ownerName: row.ownerName,
    status: row.status,
    currentKm: row.currentKm,
    notes: row.notes,
    hasPhoto: Boolean(row.imageMime),
    responsibleUserId: row.responsibleUser?.id ?? null,
    responsibleName: row.responsibleUser?.name ?? "",
    obraId: row.obra?.id ?? null,
    obraName: row.obra?.name ?? "",
    createdAt: row.createdAt.toISOString(),
    documents,
    docTones: {
      seguro: toneOf("seguro"),
      verificacion: toneOf("verificacion"),
      refrendo: toneOf("refrendo"),
      circulacion: toneOf("circulacion"),
    },
    maintenances: row.maintenances.map((item) => ({
      id: item.id,
      title: item.title,
      dueOn: item.dueOn?.toISOString() ?? null,
      dueKm: item.dueKm,
      completedOn: item.completedOn?.toISOString() ?? null,
      notes: item.notes,
      upcoming:
        !item.completedOn &&
        ((item.dueOn != null && documentTone(item.dueOn, today) !== "vigente") ||
          (item.dueKm != null && row.currentKm + 500 >= item.dueKm)),
    })),
    financing: row.financing
      ? {
          id: row.financing.id,
          kind: row.financing.kind,
          institution: row.financing.institution,
          termMonths: row.financing.termMonths,
          monthlyPayment: row.financing.monthlyPayment,
          paidInstallments: row.financing.paidInstallments,
          ...financingProgress(row.financing.termMonths, row.financing.monthlyPayment, row.financing.paidInstallments),
          balance: row.financing.balance,
          nextPaymentOn: row.financing.nextPaymentOn?.toISOString() ?? null,
          notes: row.financing.notes,
          paymentTone: row.financing.nextPaymentOn ? documentTone(row.financing.nextPaymentOn, today) : "sin_fecha",
          payments: row.financing.payments.map((payment) => ({
            id: payment.id,
            paidOn: payment.paidOn.toISOString(),
            amount: payment.amount,
            notes: payment.notes,
          })),
        }
      : null,
    expenses: row.expenses.map((item) => ({
      id: item.id,
      occurredOn: item.occurredOn.toISOString(),
      concept: item.concept,
      amount: item.amount,
      notes: item.notes,
    })),
    fuel: {
      monthAmount: Math.round(sum(monthLoads) * 100) / 100,
      yearAmount: Math.round(sum(yearLoads) * 100) / 100,
      monthLiters: Math.round(liters(monthLoads) * 100) / 100,
      yearLiters: Math.round(liters(yearLoads) * 100) / 100,
      avgPrice:
        liters(yearLoads) > 0 ? Math.round((sum(yearLoads) / liters(yearLoads)) * 100) / 100 : null,
      avgKmPerLiter:
        efficiencies.length > 0
          ? Math.round((efficiencies.reduce((total, value) => total + value, 0) / efficiencies.length) * 100) / 100
          : null,
      last: loads[0]
        ? {
            occurredOn: loads[0].occurredOn.toISOString(),
            amount: loads[0].amount,
            liters: loads[0].liters,
            stationName: loads[0].stationName,
          }
        : null,
    },
    fuelLoads: loads.map((load) => ({
      id: load.id,
      vehicleId: row.id,
      vehicleName: row.code ? `${row.code} · ${row.name}` : row.name,
      occurredOn: load.occurredOn.toISOString(),
      odometerKm: load.odometerKm,
      liters: load.liters,
      amount: load.amount,
      pricePerLiter: load.pricePerLiter || pricePerLiter(load.amount, load.liters),
      kmPerLiter: load.kmPerLiter,
      stationName: load.stationName,
      cardId: load.companyCard.id,
      cardLabel: load.companyCard.label,
      destinationKind: load.destinationKind,
      destinationLabel:
        load.destinationKind === "obra"
          ? load.obra?.name || "Obra"
          : load.destinationKind === "oficinas"
            ? "Oficinas / Administración"
            : load.costCenter || "Otro",
      obraId: load.obra?.id ?? null,
      costCenter: load.costCenter,
      receiptKind: load.receiptKind,
      notes: load.notes,
      files: load.files.map((file) => ({
        id: file.id,
        kind: file.kind,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        purged: Boolean(file.purgedAt),
        expiresAt: file.expiresAt.toISOString(),
      })),
    })),
  };
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    await purgeExpiredFuelReceipts();
    const rows = await prisma.vehicle.findMany({ orderBy: { name: "asc" }, select: vehicleDetailSelect });
    return NextResponse.json({ vehicles: rows.map(mapVehicle) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!allow(user)) return NextResponse.json({ error: "No tienes acceso a vehículos." }, { status: 403 });
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return NextResponse.json({ error: "El nombre del vehículo es obligatorio." }, { status: 400 });
    const yearRaw = String(form.get("year") ?? "").trim();
    const year = yearRaw ? Number(yearRaw) : null;
    const currentKm = Number(form.get("currentKm") ?? 0);
    const documents = JSON.parse(String(form.get("documents") ?? "[]")) as {
      kind?: string;
      name?: string;
      expiresOn?: string;
    }[];
    const image = form.get("image");
    let imageData: Buffer | undefined;
    let imageMime = "";
    if (image instanceof File && image.size > 0) {
      if (!image.type.startsWith("image/")) {
        return NextResponse.json({ error: "La foto debe ser una imagen." }, { status: 400 });
      }
      if (image.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: "La foto supera 8 MB." }, { status: 400 });
      }
      const prepared = await prepareVehicleImage(image);
      imageData = prepared.data;
      imageMime = prepared.mime;
    }
    const financeInstitution = String(form.get("financeInstitution") ?? "").trim();
    const financeMonthly = Number(form.get("financeMonthly") ?? "");
    const financeTerm = Number(form.get("financeTerm") ?? "") || 36;
    const financePaid = Number(form.get("financePaid") ?? 0) || 0;
    const wantsFinance = Boolean(financeInstitution || String(form.get("financeMonthly") ?? "").trim());
    if (wantsFinance) {
      if (!financeInstitution || !(financeMonthly > 0) || !(financeTerm > 0)) {
        return NextResponse.json({ error: "Para el financiamiento indica institución, plazo y pago mensual." }, { status: 400 });
      }
      if (financePaid < 0 || financePaid > financeTerm) {
        return NextResponse.json({ error: "Los pagos realizados no pueden pasar el plazo." }, { status: 400 });
      }
    }
    const progress = wantsFinance ? financingProgress(financeTerm, financeMonthly, financePaid) : null;

    const created = await prisma.vehicle.create({
      data: {
        code: String(form.get("code") ?? "").trim(),
        name,
        year: year && Number.isFinite(year) ? year : null,
        plates: String(form.get("plates") ?? "").trim().toUpperCase(),
        vehicleType: String(form.get("vehicleType") ?? "").trim(),
        color: String(form.get("color") ?? "").trim(),
        vin: String(form.get("vin") ?? "").trim(),
        engineNumber: String(form.get("engineNumber") ?? "").trim(),
        ownerName: String(form.get("ownerName") ?? "").trim() || "Consorcio Constructor Profesional",
        currentKm: Number.isFinite(currentKm) && currentKm > 0 ? currentKm : 0,
        notes: String(form.get("notes") ?? "").trim(),
        imageData,
        imageMime,
        createdByUserId: user.id,
        documents: {
          create: documents
            .filter((doc) => doc.kind && doc.name?.trim())
            .map((doc) => ({
              kind: String(doc.kind),
              name: String(doc.name).trim(),
              expiresOn: parseDay(doc.expiresOn),
            })),
        },
        ...(progress
          ? {
              financing: {
                create: {
                  kind: String(form.get("financeKind") ?? "") === "arrendamiento" ? "arrendamiento" : "credito",
                  institution: financeInstitution,
                  termMonths: financeTerm,
                  monthlyPayment: financeMonthly,
                  paidInstallments: progress.paid,
                  balance: progress.remainingAmount,
                  nextPaymentOn: parseDay(form.get("financeNext")),
                },
              },
            }
          : {}),
      },
      select: vehicleDetailSelect,
    });
    return NextResponse.json({ vehicle: mapVehicle(created) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
