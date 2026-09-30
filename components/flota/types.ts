export type DocTone = "vigente" | "proximo" | "vencido" | "sin_fecha";

export type FuelFileDto = {
  id: string;
  kind: string;
  originalFileName: string;
  purged: boolean;
  expiresAt: string;
};

export type FuelLoadDto = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  occurredOn: string;
  odometerKm: number;
  liters: number;
  amount: number;
  pricePerLiter: number | null;
  kmPerLiter: number | null;
  stationName: string;
  cardId: string;
  cardLabel: string;
  destinationLabel: string;
  destinationKind?: string;
  obraId?: string | null;
  costCenter?: string;
  receiptKind: string;
  notes: string;
  files: FuelFileDto[];
};

export type VehicleDto = {
  id: string;
  code: string;
  name: string;
  year: number | null;
  plates: string;
  vehicleType: string;
  color: string;
  vin: string;
  ownerName: string;
  status: string;
  currentKm: number;
  notes: string;
  hasPhoto: boolean;
  responsibleUserId: string | null;
  responsibleName: string;
  obraId: string | null;
  obraName: string;
  documents: { id: string; kind: string; name: string; expiresOn: string | null; tone: DocTone }[];
  docTones: Record<"seguro" | "verificacion" | "refrendo" | "circulacion", DocTone>;
  maintenances: {
    id: string;
    title: string;
    dueOn: string | null;
    dueKm: number | null;
    completedOn: string | null;
    notes: string;
    upcoming: boolean;
  }[];
  financing: {
    id: string;
    kind: string;
    institution: string;
    termMonths: number;
    monthlyPayment: number;
    balance: number;
    nextPaymentOn: string | null;
    notes: string;
    paymentTone: DocTone;
    payments: { id: string; paidOn: string; amount: number; notes: string }[];
  } | null;
  expenses: { id: string; occurredOn: string; concept: string; amount: number; notes: string }[];
  fuel: {
    monthAmount: number;
    yearAmount: number;
    monthLiters: number;
    yearLiters: number;
    avgPrice: number | null;
    avgKmPerLiter: number | null;
    last: { occurredOn: string; amount: number; liters: number; stationName: string } | null;
  };
  fuelLoads: FuelLoadDto[];
};

export function vehicleTitle(vehicle: { code: string; name: string; year: number | null }) {
  const base = vehicle.code ? `${vehicle.code} · ${vehicle.name}` : vehicle.name;
  return vehicle.year ? `${base} ${vehicle.year}` : base;
}
