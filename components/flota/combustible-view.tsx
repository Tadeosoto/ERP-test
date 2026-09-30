"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { FuelLoadForm } from "@/components/flota/fuel-load-form";
import type { FuelLoadDto, VehicleDto } from "@/components/flota/types";
import type { CompanyCardDto, ObraDto } from "@/lib/domain/types";
import { formatDate, formatMoney } from "@/lib/format";

const money = (amount: number) => formatMoney(amount, "MXN");

function monthKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit" }).format(new Date(iso));
}

function yearKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric" }).format(new Date(iso));
}

export function CombustibleView({ onRegisterRefresh }: { onRegisterRefresh?: (fn: () => void) => void }) {
  const [loads, setLoads] = useState<FuelLoadDto[]>([]);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [cards, setCards] = useState<CompanyCardDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("mes");
  const [vehicleId, setVehicleId] = useState("");
  const [station, setStation] = useState("");
  const [cardId, setCardId] = useState("");
  const [destination, setDestination] = useState("");

  const load = useCallback(async () => {
    const [fRes, vRes, cRes, oRes] = await Promise.all([
      fetch("/api/fuel-loads", { credentials: "include" }),
      fetch("/api/vehicles", { credentials: "include" }),
      fetch("/api/company-cards", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (fRes.ok) setLoads(((await fRes.json()) as { loads: FuelLoadDto[] }).loads);
    if (vRes.ok) setVehicles(((await vRes.json()) as { vehicles: VehicleDto[] }).vehicles);
    if (cRes.ok) setCards(((await cRes.json()) as { cards: CompanyCardDto[] }).cards);
    if (oRes.ok) setObras(((await oRes.json()) as { obras: ObraDto[] }).obras);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    onRegisterRefresh?.(() => void load());
  }, [load, onRegisterRefresh]);

  const now = new Date().toISOString();
  const thisMonth = monthKey(now);
  const prev = new Date();
  prev.setMonth(prev.getMonth() - 1);
  const prevMonth = monthKey(prev.toISOString());

  const filtered = useMemo(() => {
    return loads.filter((row) => {
      if (period === "mes" && monthKey(row.occurredOn) !== thisMonth) return false;
      if (period === "anio" && yearKey(row.occurredOn) !== yearKey(now)) return false;
      if (vehicleId && row.vehicleId !== vehicleId) return false;
      if (station && row.stationName !== station) return false;
      if (cardId && row.cardId !== cardId) return false;
      if (destination && row.destinationLabel !== destination) return false;
      return true;
    });
  }, [cardId, destination, loads, now, period, station, thisMonth, vehicleId]);

  const previous = loads.filter((row) => monthKey(row.occurredOn) === prevMonth);
  const spent = filtered.reduce((total, row) => total + row.amount, 0);
  const liters = filtered.reduce((total, row) => total + row.liters, 0);
  const avgPrice = liters > 0 ? spent / liters : null;
  const withoutInvoice = filtered.filter((row) => row.receiptKind !== "factura");
  const prevSpent = previous.reduce((total, row) => total + row.amount, 0);
  const delta = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null;

  const byVehicle = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filtered) map.set(row.vehicleName, (map.get(row.vehicleName) ?? 0) + row.liters);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filtered]);
  const maxLiters = Math.max(1, ...byVehicle.map((item) => item[1]));

  const trend = useMemo(() => {
    const points: { label: string; value: number | null }[] = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setMonth(date.getMonth() - offset);
      const key = monthKey(date.toISOString());
      const sample = loads.filter((row) => monthKey(row.occurredOn) === key && row.kmPerLiter != null);
      const avg = sample.length
        ? sample.reduce((total, row) => total + (row.kmPerLiter ?? 0), 0) / sample.length
        : null;
      points.push({
        label: new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "America/Mexico_City" }).format(date),
        value: avg,
      });
    }
    return points;
  }, [loads]);
  const trendMax = Math.max(1, ...trend.map((point) => point.value ?? 0));

  const stations = [...new Set(loads.map((row) => row.stationName))];
  const destinations = [...new Set(loads.map((row) => row.destinationLabel))];

  if (loading) return <LoadingScreen message="Cargando combustible" />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Combustible</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Cada carga es un gasto, con factura, ticket o sin comprobante. El archivo se conserva 3 meses; el registro se queda.
          </p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white">
          Registrar carga
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <option value="mes">Este mes</option>
          <option value="anio">Este año</option>
          <option value="todos">Todo</option>
        </select>
        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <option value="">Todos los vehículos</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>{vehicle.code || vehicle.name}</option>
          ))}
        </select>
        <select value={station} onChange={(e) => setStation(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <option value="">Todas las gasolineras</option>
          {stations.map((name) => <option key={name}>{name}</option>)}
        </select>
        <select value={cardId} onChange={(e) => setCardId(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <option value="">Todas las tarjetas</option>
          {cards.map((card) => <option key={card.id} value={card.id}>{card.label}</option>)}
        </select>
        <select value={destination} onChange={(e) => setDestination(e.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
          <option value="">Todas las obras</option>
          {destinations.map((name) => <option key={name}>{name}</option>)}
        </select>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Gasto del periodo</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{money(spent)}</p>
          {period === "mes" && delta != null && <p className="text-xs text-zinc-500">{delta}% vs. mes anterior</p>}
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Litros consumidos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{liters.toLocaleString("es-MX", { maximumFractionDigits: 1 })} L</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Precio promedio</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{avgPrice == null ? "—" : `${money(avgPrice)} / L`}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Cargas sin factura</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{withoutInvoice.length}</p>
          <p className="text-xs text-zinc-500">{money(withoutInvoice.reduce((total, row) => total + row.amount, 0))}</p>
        </article>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="font-bold text-zinc-900">Consumo por vehículo (litros)</h2>
          {byVehicle.length === 0 ? <p className="mt-6 text-sm text-zinc-500">Todavía no hay cargas en este periodo.</p> : (
            <div className="mt-4 flex h-48 items-end gap-3">
              {byVehicle.map(([name, value]) => (
                <div key={name} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-semibold tabular-nums text-zinc-600">{Math.round(value)}</span>
                  <div className="w-full rounded-t-lg bg-sky-500" style={{ height: `${Math.max(8, (value / maxLiters) * 140)}px` }} />
                  <span className="w-full truncate text-center text-[10px] text-zinc-500">{name.split("·")[0]}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="font-bold text-zinc-900">Rendimiento promedio</h2>
          <p className="text-xs text-zinc-500">Últimos 6 meses, km/L</p>
          <svg viewBox="0 0 320 140" className="mt-3 h-40 w-full">
            <polyline
              fill="none"
              stroke="#0f766e"
              strokeWidth="3"
              points={trend
                .map((point, index) => {
                  const x = 20 + index * 56;
                  const y = point.value == null ? 120 : 120 - (point.value / trendMax) * 90;
                  return `${x},${y}`;
                })
                .join(" ")}
            />
            {trend.map((point, index) => (
              <text key={point.label} x={20 + index * 56} y="136" textAnchor="middle" fontSize="10" fill="#71717a">{point.label}</text>
            ))}
          </svg>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-4 py-3 font-bold text-zinc-900">Últimas cargas</div>
        {filtered.length === 0 ? <p className="p-6 text-sm text-zinc-500">No hay cargas con esos filtros.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  {["Fecha", "Vehículo", "Km", "Litros", "Importe", "Precio/L", "Proveedor", "Tarjeta", "Obra", "Factura"].map((head) => (
                    <th key={head} className="px-3 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(row.occurredOn)}</td>
                    <td className="px-3 py-3"><Link className="font-medium text-orange-800" href={`/vehiculos/${row.vehicleId}?tab=combustible`}>{row.vehicleName}</Link></td>
                    <td className="px-3 py-3 tabular-nums">{row.odometerKm.toLocaleString("es-MX")}</td>
                    <td className="px-3 py-3 tabular-nums">{row.liters}</td>
                    <td className="px-3 py-3 tabular-nums">{money(row.amount)}</td>
                    <td className="px-3 py-3 tabular-nums">{row.pricePerLiter == null ? "—" : money(row.pricePerLiter)}</td>
                    <td className="px-3 py-3">{row.stationName}</td>
                    <td className="px-3 py-3">{row.cardLabel}</td>
                    <td className="px-3 py-3">{row.destinationLabel}</td>
                    <td className="px-3 py-3">
                      {row.receiptKind === "factura" ? "Factura" : row.receiptKind === "ticket" ? "Ticket" : "Sin comprobante"}
                      {row.files.filter((file) => !file.purged).map((file) => (
                        <a key={file.id} href={`/api/fuel-load-files/${file.id}`} target="_blank" rel="noreferrer" className="ml-2 text-orange-700">Ver</a>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Registrar carga</h2>
              <button type="button" className="text-sm text-zinc-500" onClick={() => setOpen(false)}>Cerrar</button>
            </div>
            <FuelLoadForm vehicles={vehicles} cards={cards} obras={obras} onDone={() => { setOpen(false); void load(); }} />
          </div>
        </div>
      )}
    </div>
  );
}
