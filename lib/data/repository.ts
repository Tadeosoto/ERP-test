import type { PurchaseCase } from "@/lib/domain/types";
import { DEMO_USERS } from "@/lib/auth/users";

const STORAGE_KEY = "ccp_erp_cases_v1";

export interface PersistedPayload {
  schemaVersion: 1;
  cases: PurchaseCase[];
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("ccp-erp-storage"));
}

export function loadPersisted(): PersistedPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PersistedPayload;
    if (p?.schemaVersion !== 1 || !Array.isArray(p.cases)) return null;
    return p;
  } catch {
    return null;
  }
}

export function savePersisted(payload: PersistedPayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  notify();
}

export function listCases(): PurchaseCase[] {
  return loadPersisted()?.cases ?? [];
}

export function getCase(id: string): PurchaseCase | undefined {
  return listCases().find((c) => c.id === id);
}

export function upsertCase(c: PurchaseCase): void {
  const all = listCases();
  const i = all.findIndex((x) => x.id === c.id);
  const next = i >= 0 ? [...all.slice(0, i), c, ...all.slice(i + 1)] : [...all, c];
  savePersisted({ schemaVersion: 1, cases: next });
}

export function exportJson(): string {
  return JSON.stringify({ schemaVersion: 1 as const, cases: listCases() }, null, 2);
}

export function importJson(json: string): { ok: true } | { ok: false; error: string } {
  try {
    const p = JSON.parse(json) as PersistedPayload;
    if (p?.schemaVersion === 1 && Array.isArray(p.cases)) {
      savePersisted(p);
      return { ok: true };
    }
    return { ok: false, error: "Formato inválido" };
  } catch {
    return { ok: false, error: "JSON inválido" };
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function seedCases(): PurchaseCase[] {
  const t = nowIso();
  const costos = DEMO_USERS.find((u) => u.role === "costos")!;
  const ing = DEMO_USERS.find((u) => u.role === "ingeniero")!;
  return [
    {
      id: genId(),
      title: "Cable THWN — subestación",
      supplierName: "Electro Mayorista SA",
      amountOc: 42500,
      currency: "MXN",
      description: "Material obra Norte",
      createdAt: t,
      updatedAt: t,
      createdByUserId: costos.id,
      status: "approved",
      engineerApprovedAt: t,
      engineerApprovedByUserId: ing.id,
      engineerComment: "Conforme",
    },
    {
      id: genId(),
      title: "Terminales compresión",
      supplierName: "Conecta Industrial",
      amountOc: 18200.5,
      currency: "MXN",
      description: "Lote 12",
      createdAt: t,
      updatedAt: t,
      createdByUserId: costos.id,
      status: "paid",
      engineerApprovedAt: t,
      engineerApprovedByUserId: ing.id,
      payment: {
        reference: "TRF-99821",
        amount: 18200.5,
        paidAt: t,
        receiptFile: { name: "comprobante.pdf", sizeBytes: 80000 },
      },
    },
  ];
}

export function seedIfEmpty(): void {
  if (typeof window === "undefined") return;
  if (loadPersisted()) return;
  savePersisted({ schemaVersion: 1, cases: seedCases() });
}

export function resetDemoData(): void {
  savePersisted({ schemaVersion: 1, cases: seedCases() });
}

export function createDraftCase(input: {
  title: string;
  supplierName: string;
  amountOc: number;
  currency: string;
  description: string;
  createdByUserId: string;
}): PurchaseCase {
  const t = nowIso();
  return {
    id: genId(),
    title: input.title.trim(),
    supplierName: input.supplierName.trim(),
    amountOc: input.amountOc,
    currency: input.currency.trim() || "MXN",
    description: input.description.trim(),
    createdAt: t,
    updatedAt: t,
    createdByUserId: input.createdByUserId,
    status: "draft",
  };
}
