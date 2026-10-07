"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompromisoRecurrenteModal } from "@/components/pagos/compromiso-recurrente-modal";
import { useSession } from "@/components/session-provider";
import { useConfirmDelete } from "@/components/ui/confirm-delete-provider";
import { useFeedback } from "@/components/ui/feedback-provider";
import { LoadingScreen } from "@/components/ui/loading-screen";
import {
  ADMIN_DOC_GAP_LABEL,
  ADMIN_EXPENSE_CATEGORIES,
  ADMIN_EXPENSE_STATUS_DOT,
  ADMIN_EXPENSE_STATUS_LABEL,
  ADMIN_EXPENSE_STATUS_TONE,
  adminExpenseDocGaps,
  adminExpenseStatus,
  categoryLabel,
  mexicoMonthKey,
  type AdminExpenseDisplayStatus,
} from "@/lib/domain/admin-expenses";
import {
  COMMITMENT_FREQUENCIES,
  COMMITMENT_FREQUENCY_LABEL,
  daysUntil,
  type CommitmentFrequency,
} from "@/lib/domain/recurring-commitments";
import { canManageRecurringCommitments } from "@/lib/domain/transitions";
import type { RecurringCommitmentDto, SupplierDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const DOC_GAP_CLASS = "inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-900";

function DocMarks({ files }: { files: { kind: string; id?: string }[] }) {
  const pago = files.find((file) => file.kind === "comprobante_pago" && file.id);
  const factura = files.find((file) => file.kind === "factura" && file.id);
  const gaps = adminExpenseDocGaps(files);
  return (
    <div className="flex flex-col items-start gap-1">
      {pago?.id ? (
        <a className="text-xs font-semibold text-orange-700" href={`/api/recurring-commitment-files/${pago.id}`} target="_blank" rel="noreferrer">
          Ver pago
        </a>
      ) : null}
      {factura?.id ? (
        <a className="text-xs font-semibold text-orange-700" href={`/api/recurring-commitment-files/${factura.id}`} target="_blank" rel="noreferrer">
          Ver factura
        </a>
      ) : null}
      {gaps.map((gap) => (
        <span key={gap} className={DOC_GAP_CLASS}>{ADMIN_DOC_GAP_LABEL[gap]}</span>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: AdminExpenseDisplayStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ADMIN_EXPENSE_STATUS_TONE[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ADMIN_EXPENSE_STATUS_DOT[status]}`} />
      {ADMIN_EXPENSE_STATUS_LABEL[status]}
    </span>
  );
}

function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  return mexicoMonthKey(new Date(year, month - 1 + delta, 15));
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX", { month: "short", year: "numeric" }).format(new Date(year, month - 1, 15));
}

function daysLabel(dueDate: string): string {
  const days = daysUntil(dueDate);
  if (days < 0) return days === -1 ? "Hace 1 día" : `Hace ${Math.abs(days)} días`;
  if (days === 0) return "Hoy";
  return days === 1 ? "1 día" : `${days} días`;
}

function Donut({
  slices,
  total,
}: {
  slices: { color: string; value: number }[];
  total: number;
}) {
  const sum = slices.reduce((acc, slice) => acc + slice.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f4f4f5" strokeWidth="16" />
        {sum > 0 &&
          slices.map((slice, index) => {
            const len = (slice.value / sum) * c;
            const node = (
              <circle
                key={index}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={slice.color}
                strokeWidth="16"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              />
            );
            offset += len;
            return node;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-semibold leading-tight text-zinc-900">{formatMoney(total, "MXN")}</p>
        <p className="text-[10px] text-zinc-500">Total</p>
      </div>
    </div>
  );
}

export function CompromisosRecurrentesView({
  onRegisterRefresh,
}: {
  onRegisterRefresh?: (fn: () => void) => void;
}) {
  const { user } = useSession();
  const { confirmDelete } = useConfirmDelete();
  const { showSuccess, showError } = useFeedback();
  const [commitments, setCommitments] = useState<RecurringCommitmentDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [supplier, setSupplier] = useState("");
  const [frequency, setFrequency] = useState("");
  const [status, setStatus] = useState("");
  const [chartMonth, setChartMonth] = useState(() => mexicoMonthKey(new Date()));
  const [modalOpen, setModalOpen] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [editing, setEditing] = useState<RecurringCommitmentDto | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const canManage = Boolean(user && canManageRecurringCommitments(user.role));

  const load = useCallback(async () => {
    const [comRes, supRes] = await Promise.all([
      fetch("/api/recurring-commitments", { credentials: "include" }),
      fetch("/api/suppliers", { credentials: "include" }),
    ]);
    if (comRes.ok) {
      const data = (await comRes.json()) as { commitments: RecurringCommitmentDto[] };
      setCommitments(data.commitments);
    }
    if (supRes.ok) {
      const data = (await supRes.json()) as { suppliers: SupplierDto[] };
      setSuppliers(data.suppliers);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const thisMonth = mexicoMonthKey(new Date());
  const prevMonth = mexicoMonthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15));

  const kpis = useMemo(() => {
    let monthTotal = 0;
    let prevTotal = 0;
    let payable = 0;
    let payableCount = 0;
    let soon = 0;
    let soonCount = 0;
    let overdue = 0;
    let overdueCount = 0;
    for (const row of commitments) {
      const rowMonth = mexicoMonthKey(new Date(row.occurredOn));
      if (rowMonth === thisMonth) monthTotal += row.amount;
      if (rowMonth === prevMonth) prevTotal += row.amount;
      const display = adminExpenseStatus(row.workflowStatus, row.dueDate);
      if (display === "pagado") continue;
      payable += row.amount;
      payableCount += 1;
      const days = daysUntil(row.dueDate);
      if (days < 0) {
        overdue += row.amount;
        overdueCount += 1;
      } else if (days <= 7) {
        soon += row.amount;
        soonCount += 1;
      }
    }
    const delta = prevTotal > 0 ? Math.round(((monthTotal - prevTotal) / prevTotal) * 100) : null;
    return { monthTotal, payable, payableCount, soon, soonCount, overdue, overdueCount, delta };
  }, [commitments, thisMonth, prevMonth]);

  const upcoming = useMemo(
    () =>
      commitments
        .filter((row) => adminExpenseStatus(row.workflowStatus, row.dueDate) !== "pagado")
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 6),
    [commitments]
  );

  const chart = useMemo(() => {
    const totals = new Map<string, { amount: number; concepts: string[] }>();
    for (const row of commitments) {
      if (mexicoMonthKey(new Date(row.occurredOn)) !== chartMonth) continue;
      const key = row.category || "otro";
      const bucket = totals.get(key) ?? { amount: 0, concepts: [] };
      bucket.amount += row.amount;
      bucket.concepts.push(row.concept);
      totals.set(key, bucket);
    }
    const slices = [...totals.entries()]
      .map(([value, bucket]) => ({
        value,
        amount: bucket.amount,
        concepts: bucket.concepts,
        label: categoryLabel(value),
        color: ADMIN_EXPENSE_CATEGORIES.find((item) => item.value === value)?.color ?? "#94a3b8",
      }))
      .sort((a, b) => b.amount - a.amount);
    const total = slices.reduce((sum, slice) => sum + slice.amount, 0);
    return { slices, total };
  }, [commitments, chartMonth]);

  const months = useMemo(() => {
    const keys = new Set(commitments.map((row) => mexicoMonthKey(new Date(row.occurredOn))));
    return [...keys].sort().reverse();
  }, [commitments]);

  const supplierNames = useMemo(
    () => [...new Set(commitments.map((row) => row.supplierName))].sort((a, b) => a.localeCompare(b, "es")),
    [commitments]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = commitments.filter((row) => {
      const display = adminExpenseStatus(row.workflowStatus, row.dueDate);
      if (q && !`${row.concept} ${row.supplierName}`.toLowerCase().includes(q)) return false;
      if (month && mexicoMonthKey(new Date(row.occurredOn)) !== month) return false;
      if (category && row.category !== category) return false;
      if (supplier && row.supplierName !== supplier) return false;
      if (frequency && row.frequency !== frequency) return false;
      if (status === "sin_pagar" && display === "pagado") return false;
      if (status === "pendiente_pago" && adminExpenseDocGaps(row.files).includes("pendiente_pago") === false) return false;
      if (status === "pendiente_factura" && adminExpenseDocGaps(row.files).includes("pendiente_factura") === false) return false;
      if (status && status !== "sin_pagar" && status !== "pendiente_pago" && status !== "pendiente_factura" && display !== status) return false;
      return true;
    });
    rows.sort((a, b) => {
      if (status === "sin_pagar") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return new Date(b.occurredOn).getTime() - new Date(a.occurredOn).getTime();
    });
    return rows;
  }, [commitments, query, month, category, supplier, frequency, status]);

  function showUnpaid() {
    setStatus("sin_pagar");
    document.getElementById("gastos-tabla")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setQuery("");
    setMonth("");
    setCategory("");
    setSupplier("");
    setFrequency("");
    setStatus("");
  }

  async function markPaid(row: RecurringCommitmentDto) {
    const res = await fetch(`/api/recurring-commitments/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ workflowStatus: "paid" }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      showError(data?.error ?? "No se pudo marcar como pagado.");
      return;
    }
    showSuccess("Gasto marcado como pagado.");
    setMenuId(null);
    void load();
  }

  async function remove(row: RecurringCommitmentDto) {
    const ok = await confirmDelete({
      title: "Eliminar gasto",
      message: `Se eliminará ${row.concept} de ${row.supplierName}. El historial de los demás periodos se conserva.`,
      itemName: `${row.concept} (${row.supplierName})`,
    });
    if (!ok) return;
    const res = await fetch(`/api/recurring-commitments/${row.id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      showError("No se pudo eliminar.");
      return;
    }
    showSuccess("Gasto eliminado.");
    setMenuId(null);
    void load();
  }

  if (loading) return <LoadingScreen message="Cargando gastos administrativos" />;

  return (
    <div className="space-y-5 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="dash-page-title">Gastos administrativos</h1>
          <p className="dash-body mt-1 text-zinc-600">Gastos generales de la empresa que no corresponden a una obra.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary !min-h-10 !px-4 !text-sm"
              onClick={() => {
                setEditing(null);
                setRecurring(true);
                setModalOpen(true);
              }}
            >
              Gasto recurrente
            </button>
            <button
              type="button"
              className="btn-primary !min-h-10 !px-4 !text-sm"
              onClick={() => {
                setEditing(null);
                setRecurring(false);
                setModalOpen(true);
              }}
            >
              + Nuevo gasto
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Gastos del mes" value={formatMoney(kpis.monthTotal, "MXN")} sub={kpis.delta == null ? "Sin mes anterior para comparar" : `${kpis.delta >= 0 ? "↑" : "↓"} ${Math.abs(kpis.delta)}% vs. mes anterior`} />
        <Kpi label="Por pagar" value={formatMoney(kpis.payable, "MXN")} sub={`${kpis.payableCount} gasto${kpis.payableCount === 1 ? "" : "s"}`} />
        <Kpi label="Vencen en 7 días" value={formatMoney(kpis.soon, "MXN")} sub={`${kpis.soonCount} gasto${kpis.soonCount === 1 ? "" : "s"}`} />
        <Kpi label="Vencidos" value={formatMoney(kpis.overdue, "MXN")} sub={`${kpis.overdueCount} gasto${kpis.overdueCount === 1 ? "" : "s"}`} tone="text-red-700" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="dash-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-red-100 bg-red-50/70 px-4 py-3">
            <h2 className="text-sm font-bold text-red-800">Próximos vencimientos</h2>
            <button type="button" onClick={showUnpaid} className="text-sm font-semibold text-orange-700">
              Ver todos →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs text-zinc-500">
                  <th className="px-3 py-2 font-medium">Fecha límite</th>
                  <th className="px-3 py-2 font-medium">Concepto</th>
                  <th className="px-3 py-2 font-medium">Proveedor</th>
                  <th className="px-3 py-2 font-medium">Costo</th>
                  <th className="px-3 py-2 font-medium">Días restantes</th>
                  <th className="px-3 py-2 font-medium">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">No hay gastos por pagar.</td>
                  </tr>
                ) : (
                  upcoming.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-50">
                      <td className="px-3 py-2 tabular-nums">{formatDateShort(row.dueDate)}</td>
                      <td className="px-3 py-2">{row.concept}</td>
                      <td className="px-3 py-2">{row.supplierName}</td>
                      <td className="px-3 py-2 tabular-nums">{formatMoney(row.amount, row.currency || "MXN")}</td>
                      <td className="px-3 py-2">{daysLabel(row.dueDate)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={adminExpenseStatus(row.workflowStatus, row.dueDate)} />
                          <DocMarks files={row.files} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="dash-panel p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-zinc-900">Gasto del mes por categoría</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setChartMonth((current) => shiftMonth(current, -1))}
                className="h-7 w-7 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                ‹
              </button>
              <span className="min-w-24 text-center text-xs font-medium capitalize text-zinc-600">
                {chartMonth === thisMonth ? "Este mes" : monthLabel(chartMonth)}
              </span>
              <button
                type="button"
                aria-label="Mes siguiente"
                disabled={chartMonth >= thisMonth}
                onClick={() => setChartMonth((current) => shiftMonth(current, 1))}
                className="h-7 w-7 rounded-lg border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
              >
                ›
              </button>
            </div>
          </div>
          {chart.slices.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">No hay gastos registrados en {monthLabel(chartMonth)}.</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Donut slices={chart.slices.map((slice) => ({ color: slice.color, value: slice.amount }))} total={chart.total} />
              <ul className="min-w-0 flex-1 space-y-2 text-sm">
                {chart.slices.map((slice) => (
                  <li key={slice.value} className="flex items-start gap-2">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-zinc-700">{slice.label}</span>
                      <span className="block truncate text-xs text-zinc-500">{slice.concepts.join(", ")}</span>
                    </span>
                    <span className="tabular-nums text-zinc-900">{formatMoney(slice.amount, "MXN")}</span>
                    <span className="w-10 text-right text-xs text-zinc-500">{chart.total > 0 ? Math.round((slice.amount / chart.total) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>

      <div id="gastos-tabla" className="dash-panel !overflow-visible">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar concepto, proveedor…"
            className="min-w-48 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
          />
          <FilterSelect
            label="Fecha"
            value={month}
            onChange={setMonth}
            options={[{ value: "", label: "Todas" }, ...months.map((key) => ({ value: key, label: key }))]}
          />
          <FilterSelect
            label="Categoría"
            value={category}
            onChange={setCategory}
            options={[{ value: "", label: "Todas" }, ...ADMIN_EXPENSE_CATEGORIES.map((item) => ({ value: item.value, label: item.label }))]}
          />
          <FilterSelect
            label="Proveedor"
            value={supplier}
            onChange={setSupplier}
            options={[{ value: "", label: "Todos" }, ...supplierNames.map((name) => ({ value: name, label: name }))]}
          />
          <FilterSelect
            label="Periodicidad"
            value={frequency}
            onChange={setFrequency}
            options={[{ value: "", label: "Todas" }, ...COMMITMENT_FREQUENCIES.map((item) => ({ value: item.value, label: item.label }))]}
          />
          <FilterSelect
            label="Estatus"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Todos" },
              { value: "sin_pagar", label: "Sin pagar" },
              { value: "proximo", label: "Próximo" },
              { value: "vence_pronto", label: "Vence pronto" },
              { value: "vencido", label: "Vencido" },
              { value: "pagado", label: "Pagado" },
              { value: "pendiente_pago", label: "Pendiente pago" },
              { value: "pendiente_factura", label: "Pendiente factura" },
            ]}
          />
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-orange-700">
            Limpiar filtros
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs text-zinc-500">
              <tr>
                {["Fecha", "Concepto", "Proveedor", "Categoría", "Costo", "Periodicidad", "Fecha límite", "Documentos", "Estatus", "Acciones"].map((heading) => (
                  <th key={heading} className="px-3 py-2 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-zinc-500">No hay gastos con estos filtros.</td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const display = adminExpenseStatus(row.workflowStatus, row.dueDate);
                  return (
                    <tr key={row.id} className="border-t border-zinc-100">
                      <td className="px-3 py-2.5 tabular-nums">{formatDateShort(row.occurredOn)}</td>
                      <td className="px-3 py-2.5 font-medium text-zinc-900">{row.concept}</td>
                      <td className="px-3 py-2.5">{row.supplierName}</td>
                      <td className="px-3 py-2.5">{categoryLabel(row.category)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatMoney(row.amount, row.currency || "MXN")}</td>
                      <td className="px-3 py-2.5">{COMMITMENT_FREQUENCY_LABEL[row.frequency as CommitmentFrequency] ?? row.frequency}</td>
                      <td className="px-3 py-2.5 tabular-nums">{formatDateShort(row.dueDate)}</td>
                      <td className="px-3 py-2.5">
                        <DocMarks files={row.files} />
                      </td>
                      <td className="px-3 py-2.5"><StatusPill status={display} /></td>
                      <td className="relative px-3 py-2.5">
                        {canManage ? (
                          <>
                            <button type="button" className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-100" onClick={() => setMenuId(menuId === row.id ? null : row.id)} aria-label="Acciones">
                              ···
                            </button>
                            {menuId === row.id && (
                              <div className="absolute right-3 z-20 mt-1 w-40 rounded-xl border border-zinc-200 bg-white py-1 text-sm shadow-lg">
                                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={() => { setEditing(row); setRecurring(row.frequency !== "unico"); setModalOpen(true); setMenuId(null); }}>Editar</button>
                                {display !== "pagado" && (
                                  <button type="button" className="block w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={() => void markPaid(row)}>Marcar pagado</button>
                                )}
                                <button type="button" className="block w-full px-3 py-2 text-left text-red-700 hover:bg-zinc-50" onClick={() => void remove(row)}>Eliminar</button>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
          {filtered.length === 1 ? "1 registro" : `${filtered.length} registros`}
        </p>
      </div>

      {canManage && (
        <CompromisoRecurrenteModal
          open={modalOpen}
          recurring={recurring && !editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => void load()}
          suppliers={suppliers}
          editing={editing}
        />
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone = "text-zinc-900" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="dash-panel px-4 py-3">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
      {options.map((option) => (
        <option key={option.value || label} value={option.value}>
          {option.value ? option.label : label}
        </option>
      ))}
    </select>
  );
}
