"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session-provider";
import { OcLink } from "@/components/ui/oc-link";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import {
  materialRequestCode,
  materialRequestDisplayLabel,
} from "@/lib/dashboard/ingeniero-dashboard";
import {
  canDeleteMaterialRequest,
  canEditMaterialRequest,
  MATERIAL_REQUEST_STATUS_LABEL,
  type MaterialRequestStatus,
} from "@/lib/domain/solicitudes";
import { materialRequestStatusTone } from "@/lib/dashboard/material-requests-dashboard";
import type { DirectExpenseDto, MaterialRequestDto, PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";
import { payableOrders } from "@/lib/pagos/registrar-pago-form";

type StatusFilter = "todas" | "sent" | "draft" | "in_oc_process" | "completed";

function RequestActions({
  request,
  userId,
  busyId,
  onDelete,
}: {
  request: MaterialRequestDto;
  userId: string;
  busyId: string | null;
  onDelete: (id: string) => void;
}) {
  const canEdit =
    canEditMaterialRequest(request.status, "ingeniero", request.createdByUserId, userId) &&
    !request.purchaseOrderId;
  const canDelete = canDeleteMaterialRequest(
    request.status,
    "ingeniero",
    request.createdByUserId,
    userId,
    Boolean(request.purchaseOrderId)
  );
  if (!canEdit && !canDelete) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {canEdit && (
        <Link
          href={`/solicitudes/material/${request.id}?edit=1`}
          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Editar
        </Link>
      )}
      {canDelete && (
        <button
          type="button"
          disabled={busyId === request.id}
          onClick={() => onDelete(request.id)}
          className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {busyId === request.id ? "…" : "Eliminar"}
        </button>
      )}
    </div>
  );
}

export default function NuevaSolicitudPage() {
  const { user } = useSession();
  const { showSuccess, showError } = useFeedback();
  const [requests, setRequests] = useState<MaterialRequestDto[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderDto[]>([]);
  const [expenses, setExpenses] = useState<DirectExpenseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todas");
  const [obraFilter, setObraFilter] = useState("all");

  const load = useCallback(async () => {
    if (!user || user.role !== "ingeniero") {
      setLoading(false);
      return;
    }
    const [matRes, ordRes, expRes] = await Promise.all([
      fetch("/api/material-requests?mine=1", { credentials: "include" }),
      fetch("/api/orders", { credentials: "include" }),
      fetch("/api/direct-expenses?mine=1", { credentials: "include" }),
    ]);
    if (matRes.ok) {
      const d = (await matRes.json()) as { requests: MaterialRequestDto[] };
      setRequests(d.requests);
    }
    if (ordRes.ok) {
      const d = (await ordRes.json()) as { orders: PurchaseOrderDto[] };
      setOrders(d.orders);
    }
    if (expRes.ok) {
      const d = (await expRes.json()) as { expenses: DirectExpenseDto[] };
      setExpenses(d.expenses);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const myRequestIds = useMemo(() => new Set(requests.map((r) => r.id)), [requests]);

  const obrasOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of requests) map.set(r.obraId, r.obraName);
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...requests]
      .filter((r) => {
        if (statusFilter !== "todas" && r.status !== statusFilter) return false;
        if (obraFilter !== "all" && r.obraId !== obraFilter) return false;
        if (!q) return true;
        const hay = [
          materialRequestCode(r),
          materialRequestDisplayLabel(r),
          r.obraName,
          r.materials,
          MATERIAL_REQUEST_STATUS_LABEL[r.status],
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [requests, search, statusFilter, obraFilter]);

  const pendingOcCount = useMemo(
    () => requests.filter((r) => r.status === "sent").length,
    [requests]
  );

  const pendingCarolinaPayments = useMemo(() => {
    return payableOrders(orders).filter(
      (o) =>
        o.assignedEngineerUserId === user?.id ||
        (o.materialRequestId != null && myRequestIds.has(o.materialRequestId))
    );
  }, [orders, user?.id, myRequestIds]);

  const pendingDirectPayments = useMemo(
    () => expenses.filter((e) => e.status === "sent"),
    [expenses]
  );

  async function deleteRequest(requestId: string) {
    if (!window.confirm("¿Eliminar esta solicitud? Esta acción no se puede deshacer.")) return;
    setBusyId(requestId);
    try {
      const res = await fetch(`/api/material-requests/${requestId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "No se pudo eliminar.");
      showSuccess("Solicitud eliminada.");
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : "Error al eliminar.");
    } finally {
      setBusyId(null);
    }
  }

  if (user && user.role !== "ingeniero") {
    return (
      <div className="card p-8">
        <p>Solo Ingeniería puede iniciar solicitudes.</p>
        <p className="mt-2 text-sm text-zinc-600">
          Si eres Compras o Administración, revisa las solicitudes pendientes de OC en{" "}
          <Link href="/solicitudes-ingenieria" className="font-semibold text-orange-700 underline">
            Solicitudes Ingeniería
          </Link>
          .
        </p>
        <Link href="/inicio" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  if (loading) return <LoadingScreen message="Cargando solicitudes" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Solicitudes</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Crea, edita o elimina tus solicitudes mientras no tengan OC o pago. Busca y filtra en el
          listado de abajo.
        </p>
      </header>

      {(pendingCarolinaPayments.length > 0 || pendingDirectPayments.length > 0) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-amber-950">Pagos pendientes (Administración)</h2>
              <p className="mt-0.5 text-xs text-amber-900/80">
                Ya hay OC o gasto enviado; esperan que Carolina registre el pago.
              </p>
            </div>
            <span className="rounded-full bg-amber-200/80 px-2.5 py-1 text-xs font-semibold text-amber-950">
              {pendingCarolinaPayments.length + pendingDirectPayments.length}
            </span>
          </div>
          <ul className="mt-3 divide-y divide-amber-100/80">
            {pendingCarolinaPayments.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0">
                <div className="min-w-0 flex-1">
                  <OcLink order={order} className="text-sm font-semibold text-amber-950 hover:underline" />
                  <p className="truncate text-xs text-amber-900/70">
                    {order.obraName} · {order.supplierName}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-amber-950">
                  {formatMoney(order.amountRemaining, order.currency)}
                </p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                  Por pagar
                </span>
              </li>
            ))}
            {pendingDirectPayments.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/solicitudes/gasto/${e.id}`}
                    className="text-sm font-semibold text-amber-950 hover:underline"
                  >
                    Gasto directo · {e.category || e.obraName}
                  </Link>
                  <p className="truncate text-xs text-amber-900/70">{e.obraName}</p>
                </div>
                <p className="text-sm font-semibold tabular-nums text-amber-950">
                  {formatMoney(e.estimatedAmount, e.currency)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-200">
                    Por pagar
                  </span>
                  <Link
                    href={`/solicitudes/gasto/${e.id}?edit=1`}
                    className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    Editar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/solicitudes/material/nueva"
          className="card group block p-6 transition hover:border-orange-300 hover:shadow-md"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Proceso A</p>
          <h2 className="mt-2 text-lg font-bold text-zinc-900">Solicitud de material</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Compra con OC. Ingeniería solicita materiales; Compras cotiza, crea la OC y envía el PDF para tu
            aprobación.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-orange-700 group-hover:underline">
            Crear solicitud A →
          </span>
        </Link>

        <Link
          href="/solicitudes/gasto/nueva"
          className="card group block p-6 transition hover:border-teal-300 hover:shadow-md"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-teal-600">Proceso B</p>
          <h2 className="mt-2 text-lg font-bold text-zinc-900">Gasto directo</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sin OC ni Compras. Administración registra el pago y la factura; Recepción y Contabilidad cierran el
            expediente.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-teal-700 group-hover:underline">
            Crear solicitud B →
          </span>
        </Link>
      </div>

      <section className="card overflow-hidden p-0">
        <div className="border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Mis solicitudes recientes</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Busca y filtra. Las pendientes de OC llevan la etiqueta en la esquina.
                {pendingOcCount > 0 ? ` · ${pendingOcCount} pendiente${pendingOcCount === 1 ? "" : "s"} de OC` : ""}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs text-zinc-500">
              Buscar
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Obra, material, folio…"
                className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm text-zinc-900"
              />
            </label>
            <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-500">
              Estado
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
              >
                <option value="todas">Todas</option>
                <option value="sent">Pendientes de OC</option>
                <option value="draft">Borrador</option>
                <option value="in_oc_process">OC en proceso</option>
                <option value="completed">Completadas</option>
              </select>
            </label>
            <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-zinc-500">
              Obra
              <select
                value={obraFilter}
                onChange={(e) => setObraFilter(e.target.value)}
                className="min-h-10 rounded-xl border border-zinc-200 px-3 text-sm"
              >
                <option value="all">Todas</option>
                {obrasOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            {(search || statusFilter !== "todas" || obraFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("todas");
                  setObraFilter("all");
                }}
                className="min-h-10 rounded-xl border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500 sm:px-5">
            {requests.length === 0
              ? "Aún no tienes solicitudes. Crea una de material o un gasto directo."
              : "Ninguna solicitud coincide con la búsqueda o los filtros."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {filteredRequests.map((r) => {
              const isPendingOc = r.status === "sent";
              return (
                <li key={r.id} className="relative space-y-2 px-4 py-3 pr-28 sm:px-5 sm:pr-32">
                  {isPendingOc ? (
                    <span className="absolute right-4 top-3 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm sm:right-5">
                      Pendiente de OC
                    </span>
                  ) : (
                    <span
                      className={`absolute right-4 top-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 sm:right-5 ${materialRequestStatusTone(r.status as MaterialRequestStatus)}`}
                    >
                      {MATERIAL_REQUEST_STATUS_LABEL[r.status]}
                    </span>
                  )}
                  <div className="min-w-0">
                    <Link
                      href={`/solicitudes/material/${r.id}`}
                      className="text-sm font-semibold text-sky-800 hover:underline"
                    >
                      {materialRequestCode(r)} · {materialRequestDisplayLabel(r)}
                    </Link>
                    <p className="truncate text-xs text-zinc-500">
                      {r.obraName}
                      {r.sentAt ? ` · enviada ${formatDateShort(r.sentAt)}` : ""}
                    </p>
                  </div>
                  {user && (
                    <RequestActions
                      request={r}
                      userId={user.id}
                      busyId={busyId}
                      onDelete={(rid) => void deleteRequest(rid)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
