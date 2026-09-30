"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@/components/ui/action-icons";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { EmployeeDto, ObraDto, ViaticoListItemDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

const money = (amount: number) => formatMoney(amount, "MXN");

export function ViaticosListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [viaticos, setViaticos] = useState<ViaticoListItemDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [obraId, setObraId] = useState("");
  const [deliveredAmount, setDeliveredAmount] = useState("");

  const load = useCallback(async () => {
    const [vRes, eRes, oRes] = await Promise.all([
      fetch("/api/viaticos", { credentials: "include" }),
      fetch("/api/employees", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (vRes.ok) {
      const data = (await vRes.json()) as { viaticos: ViaticoListItemDto[] };
      setViaticos(data.viaticos);
    }
    if (eRes.ok) {
      const data = (await eRes.json()) as { employees: EmployeeDto[] };
      setEmployees(data.employees);
    }
    if (oRes.ok) {
      const data = (await oRes.json()) as { obras: ObraDto[] };
      setObras(data.obras);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const activeEmployees = employees.filter((e) => e.active);
  const activeObras = obras.filter((o) => o.active);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return viaticos;
    return viaticos.filter((v) => `${v.employeeName} ${v.obraName}`.toLowerCase().includes(q));
  }, [search, viaticos]);

  async function createViatico(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/viaticos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, obraId, deliveredAmount: Number(deliveredAmount) }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; viatico?: { id: string } } | null;
    setSaving(false);
    if (!res.ok || !data?.viatico) {
      showError(data?.error ?? "No se pudo registrar el viático.");
      return;
    }
    showSuccess("Viático registrado.");
    router.push(`/viaticos/${data.viatico.id}`);
  }

  if (loading) return <LoadingScreen message="Cargando viáticos" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Viáticos</h1>
          <p className="mt-1 text-sm text-zinc-500">Dinero entregado, gastos y el comprobante de cada uno.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <IconPlus className="h-4 w-4" />
          Nuevo viático
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar empleado u obra"
        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm sm:max-w-sm"
      />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No hay viáticos con ese criterio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Empleado</th>
                  <th className="px-4 py-3 font-semibold">Obra</th>
                  <th className="px-4 py-3 font-semibold">Entregado</th>
                  <th className="px-4 py-3 font-semibold">Gastado</th>
                  <th className="px-4 py-3 font-semibold">Por devolver</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-orange-50/40"
                    onClick={() => router.push(`/viaticos/${row.id}`)}
                  >
                    <td className="px-4 py-3 font-semibold text-zinc-900">{row.employeeName}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.obraName}</td>
                    <td className="px-4 py-3 tabular-nums">{money(row.summary.delivered)}</td>
                    <td className="px-4 py-3 tabular-nums">{money(row.summary.spent)}</td>
                    <td className={`px-4 py-3 tabular-nums font-medium ${row.summary.toReturn < 0 ? "text-red-700" : "text-zinc-900"}`}>
                      {money(row.summary.toReturn)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">{formatDateShort(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <form onSubmit={(e) => void createViatico(e)} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-zinc-900">Registrar entrega</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500">
                Cerrar
              </button>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Empleado</span>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
              >
                <option value="">Selecciona</option>
                {activeEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.fullName}
                  </option>
                ))}
              </select>
            </label>
            {activeEmployees.length === 0 && (
              <p className="text-sm text-amber-800">Primero da de alta un empleado en Catálogos.</p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Obra</span>
              <select
                required
                value={obraId}
                onChange={(e) => setObraId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
              >
                <option value="">Selecciona</option>
                {activeObras.map((obra) => (
                  <option key={obra.id} value={obra.id}>
                    {obra.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Monto entregado (MXN)</span>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={deliveredAmount}
                onChange={(e) => setDeliveredAmount(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2.5"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-orange-600 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Registrar"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
