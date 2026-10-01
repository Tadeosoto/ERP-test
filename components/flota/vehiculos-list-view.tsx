"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { VehiclePhoto } from "@/components/flota/vehicle-photo";
import { VehiculoForm } from "@/components/flota/vehiculo-form";
import type { DocTone, VehicleDto } from "@/components/flota/types";
import { formatDate, formatMoney } from "@/lib/format";
import { vehicleTitle } from "@/components/flota/types";

const money = (n: number) => formatMoney(n, "MXN");

function Tone({ tone }: { tone: DocTone }) {
  const label = tone === "vigente" ? "Vigente" : tone === "proximo" ? "Próximo" : tone === "vencido" ? "Vencido" : "—";
  const cls =
    tone === "vigente"
      ? "bg-emerald-50 text-emerald-800"
      : tone === "proximo"
        ? "bg-amber-50 text-amber-900"
        : tone === "vencido"
          ? "bg-red-50 text-red-700"
          : "bg-zinc-100 text-zinc-400";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

export function VehiculosListView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    const vRes = await fetch("/api/vehicles", { credentials: "include" });
    if (vRes.ok) setVehicles(((await vRes.json()) as { vehicles: VehicleDto[] }).vehicles);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const kpis = useMemo(() => {
    const active = vehicles.filter((item) => item.status === "activo");
    const docs = vehicles.flatMap((item) => item.documents);
    const attention = vehicles.filter((item) => item.documents.some((doc) => doc.tone === "vencido")).length;
    const soonDocs = docs.filter((doc) => doc.tone === "proximo").length;
    const fuel = active.reduce((total, item) => total + item.fuel.monthAmount, 0);
    const maintenance = vehicles.filter((item) => item.maintenances.some((job) => job.upcoming && !job.completedOn)).length;
    const payments = vehicles.filter((item) => item.financing && (item.financing.paymentTone === "proximo" || item.financing.paymentTone === "vencido")).length;
    const paymentSum = vehicles
      .filter((item) => item.financing && (item.financing.paymentTone === "proximo" || item.financing.paymentTone === "vencido"))
      .reduce((total, item) => total + (item.financing?.monthlyPayment ?? 0), 0);
    return { total: vehicles.length, active: active.length, baja: vehicles.length - active.length, attention, soonDocs, fuel, maintenance, payments, paymentSum };
  }, [vehicles]);

  const rows = vehicles.filter((item) => {
    if (status && item.status !== status) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${item.code} ${item.name} ${item.plates}`.toLowerCase().includes(q);
  });

  if (loading) return <LoadingScreen message="Cargando vehículos" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Vehículos</h1>
          <p className="text-sm text-zinc-500">Control administrativo de la flotilla.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">Nuevo vehículo</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi label="Vehículos totales" value={String(kpis.total)} hint={`${kpis.active} activos · ${kpis.baja} en baja`} />
        <Kpi label="Requieren atención" value={String(kpis.attention)} hint="Documentos vencidos" />
        <Kpi label="Próximos a vencer" value={String(kpis.soonDocs)} hint="En los próximos 30 días" />
        <Kpi label="Combustible este mes" value={money(kpis.fuel)} />
        <Kpi label="Mantenimientos próximos" value={String(kpis.maintenance)} />
        <Kpi label="Pagos próximos" value={money(kpis.paymentSum)} hint={`${kpis.payments} créditos o arrendamientos`} />
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por placa o vehículo" className="min-w-64 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="baja">En baja</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
              <tr>
                {["Vehículo", "Placas", "Año", "Tipo", "Km actual", "Última carga", "Combustible (mes)", "Seguro", "Verificación", "Refrendo", "Financiamiento", "Estado"].map((head) => (
                  <th key={head} className="px-3 py-3 font-semibold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((item) => (
                <tr key={item.id} className="cursor-pointer hover:bg-orange-50/40" onClick={() => router.push(`/vehiculos/${item.id}`)}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span className="h-10 w-14 overflow-hidden rounded-lg bg-zinc-100">
                        {item.hasPhoto && <VehiclePhoto id={item.id} alt={item.name} width={56} height={40} />}
                      </span>
                      <span>
                        <span className="block font-semibold text-zinc-900">{item.code || item.name}</span>
                        <span className="block text-xs text-zinc-500">{item.code ? item.name : ""}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">{item.plates || "—"}</td>
                  <td className="px-3 py-3">{item.year ?? "—"}</td>
                  <td className="px-3 py-3">{item.vehicleType || "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{item.currentKm.toLocaleString("es-MX")}</td>
                  <td className="px-3 py-3">{item.fuel.last ? formatDate(item.fuel.last.occurredOn) : "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{money(item.fuel.monthAmount)}</td>
                  <td className="px-3 py-3"><Tone tone={item.docTones.seguro} /></td>
                  <td className="px-3 py-3"><Tone tone={item.docTones.verificacion} /></td>
                  <td className="px-3 py-3"><Tone tone={item.docTones.refrendo} /></td>
                  <td className="px-3 py-3">
                    {item.financing ? (
                      <span>
                        <span className="block font-medium">{item.financing.paid}/{item.financing.termMonths}</span>
                        <span className="block text-xs text-zinc-500">Por pagar {money(item.financing.remainingAmount)}</span>
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-3">{item.status === "activo" ? "Activo" : "Baja"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-6 text-sm text-zinc-500">Todavía no hay vehículos.</p>}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuevo vehículo</h2>
              <button type="button" className="text-sm text-zinc-500" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
            <VehiculoForm onDone={(id) => router.push(`/vehiculos/${id}`)} />
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-900">{value}</p>
      {hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </article>
  );
}
