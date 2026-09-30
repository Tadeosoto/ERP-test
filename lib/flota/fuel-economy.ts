import { prisma } from "@/lib/db";
import { roundMoney } from "@/lib/flota/dates";

/** Recalcula km/L de cada carga con la anterior del mismo vehículo y deja el km actual en el máximo. */
export async function recomputeVehicleFuel(vehicleId: string): Promise<void> {
  const loads = await prisma.fuelLoad.findMany({
    where: { vehicleId },
    orderBy: [{ occurredOn: "asc" }, { createdAt: "asc" }],
    select: { id: true, odometerKm: true, liters: true, kmPerLiter: true },
  });
  let previousKm: number | null = null;
  let maxKm = 0;
  for (const load of loads) {
    maxKm = Math.max(maxKm, load.odometerKm);
    const kmPerLiter =
      previousKm != null && load.odometerKm > previousKm && load.liters > 0
        ? Math.round(((load.odometerKm - previousKm) / load.liters) * 100) / 100
        : null;
    if (load.kmPerLiter !== kmPerLiter) {
      await prisma.fuelLoad.update({ where: { id: load.id }, data: { kmPerLiter } });
    }
    previousKm = load.odometerKm;
  }
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { currentKm: roundMoney(maxKm) },
  });
}
