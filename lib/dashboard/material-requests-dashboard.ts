import type { MaterialRequestDto } from "@/lib/domain/types";
import type { MaterialRequestStatus } from "@/lib/domain/solicitudes";
import { materialRequestCode } from "@/lib/dashboard/ingeniero-dashboard";

export type MaterialRequestTab = "pendientes" | "realizadas" | "todas";

export type MaterialRequestSort =
  | "sent_desc"
  | "sent_asc"
  | "updated_desc"
  | "obra"
  | "ingeniero";

export type MaterialRequestKpiKey = "pendientes" | "en_oc" | "realizadas";

export const MATERIAL_REQUEST_KPI_CONFIG: {
  key: MaterialRequestKpiKey;
  label: string;
  sublabel: string;
  tab: MaterialRequestTab;
  tint: "orange" | "sky" | "emerald";
}[] = [
  {
    key: "pendientes",
    label: "Pendientes",
    sublabel: "Esperan OC",
    tab: "pendientes",
    tint: "orange",
  },
  {
    key: "en_oc",
    label: "En OC",
    sublabel: "Orden en proceso",
    tab: "realizadas",
    tint: "sky",
  },
  {
    key: "realizadas",
    label: "Con OC",
    sublabel: "Ya procesadas",
    tab: "realizadas",
    tint: "emerald",
  },
];

export function materialRequestKpiCounts(requests: MaterialRequestDto[]) {
  const visible = requests.filter((r) => r.status !== "draft");
  return {
    pendientes: visible.filter((r) => r.status === "sent").length,
    en_oc: visible.filter((r) => r.status === "in_oc_process").length,
    realizadas: visible.filter((r) => r.status === "completed" || Boolean(r.purchaseOrderId)).length,
  };
}

function sortTimestamp(r: MaterialRequestDto): number {
  const iso = r.sentAt ?? r.updatedAt ?? r.createdAt;
  return new Date(iso).getTime();
}

function matchesSearch(r: MaterialRequestDto, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const code = materialRequestCode(r).toLowerCase();
  return (
    r.obraName.toLowerCase().includes(q) ||
    r.createdByName.toLowerCase().includes(q) ||
    r.materials.toLowerCase().includes(q) ||
    r.costCenter.toLowerCase().includes(q) ||
    code.includes(q)
  );
}

function inDateRange(iso: string | null, from: string, to: string): boolean {
  if (!iso) return !from && !to;
  const t = new Date(iso).getTime();
  if (from && t < new Date(`${from}T00:00:00`).getTime()) return false;
  if (to && t > new Date(`${to}T23:59:59.999`).getTime()) return false;
  return true;
}

/** Realizadas = ya tienen OC o están completadas. */
function isRealizada(r: MaterialRequestDto): boolean {
  return r.status === "in_oc_process" || r.status === "completed" || Boolean(r.purchaseOrderId);
}

function tabFilter(r: MaterialRequestDto, tab: MaterialRequestTab): boolean {
  if (r.status === "draft") return false;
  switch (tab) {
    case "pendientes":
      return r.status === "sent";
    case "realizadas":
      return isRealizada(r);
    case "todas":
      return true;
    default:
      return true;
  }
}

export function filterMaterialRequests(input: {
  requests: MaterialRequestDto[];
  tab: MaterialRequestTab;
  obraId: string;
  engineerId: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  sort: MaterialRequestSort;
}): MaterialRequestDto[] {
  let rows = input.requests.filter((r) => tabFilter(r, input.tab));

  if (input.obraId !== "all") {
    rows = rows.filter((r) => r.obraId === input.obraId);
  }
  if (input.engineerId !== "all") {
    rows = rows.filter((r) => r.createdByUserId === input.engineerId);
  }
  rows = rows.filter(
    (r) => matchesSearch(r, input.search) && inDateRange(r.sentAt ?? r.createdAt, input.dateFrom, input.dateTo)
  );

  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (input.sort) {
      case "sent_asc":
        return sortTimestamp(a) - sortTimestamp(b);
      case "obra":
        return a.obraName.localeCompare(b.obraName, "es") || sortTimestamp(b) - sortTimestamp(a);
      case "ingeniero":
        return a.createdByName.localeCompare(b.createdByName, "es") || sortTimestamp(b) - sortTimestamp(a);
      case "updated_desc":
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case "sent_desc":
      default:
        return sortTimestamp(b) - sortTimestamp(a);
    }
  });
  return sorted;
}

export function materialRequestStatusTone(status: MaterialRequestStatus): string {
  switch (status) {
    case "sent":
      return "bg-orange-100 text-orange-800 ring-orange-200/80";
    case "in_oc_process":
      return "bg-sky-100 text-sky-800 ring-sky-200/80";
    case "completed":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200/80";
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200/80";
  }
}

export function uniqueEngineers(requests: MaterialRequestDto[]): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const r of requests) {
    if (r.status === "draft") continue;
    map.set(r.createdByUserId, r.createdByName);
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}
