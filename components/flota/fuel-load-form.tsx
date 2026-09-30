"use client";

import { useMemo, useState } from "react";
import type { CompanyCardDto, ObraDto } from "@/lib/domain/types";
import type { VehicleDto } from "@/components/flota/types";
import { formatMoney } from "@/lib/format";

function todayMx(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

export function FuelLoadForm({
  vehicles,
  cards,
  obras,
  presetVehicleId,
  onDone,
}: {
  vehicles: VehicleDto[];
  cards: CompanyCardDto[];
  obras: ObraDto[];
  presetVehicleId?: string;
  onDone: () => void;
}) {
  const [vehicleId, setVehicleId] = useState(presetVehicleId ?? "");
  const [occurredOn, setOccurredOn] = useState(todayMx());
  const [odometerKm, setOdometerKm] = useState("");
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [stationName, setStationName] = useState("");
  const [companyCardId, setCompanyCardId] = useState("");
  const [destinationKind, setDestinationKind] = useState("obra");
  const [obraId, setObraId] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [receiptKind, setReceiptKind] = useState("ticket");
  const [notes, setNotes] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [xml, setXml] = useState<File | null>(null);
  const [ticket, setTicket] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const unit = useMemo(() => {
    const money = Number(amount);
    const volume = Number(liters);
    if (!(money > 0) || !(volume > 0)) return null;
    return money / volume;
  }, [amount, liters]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const form = new FormData();
    form.set("vehicleId", vehicleId);
    form.set("occurredOn", occurredOn);
    form.set("odometerKm", odometerKm);
    form.set("liters", liters);
    form.set("amount", amount);
    form.set("stationName", stationName);
    form.set("companyCardId", companyCardId);
    form.set("destinationKind", destinationKind);
    form.set("obraId", obraId);
    form.set("costCenter", costCenter);
    form.set("receiptKind", receiptKind);
    form.set("notes", notes);
    if (receiptKind === "factura") {
      if (pdf) form.append("files", pdf);
      if (xml) form.append("files", xml);
    }
    if (receiptKind === "ticket" && ticket) form.append("files", ticket);
    setSaving(true);
    const res = await fetch("/api/fuel-loads", { method: "POST", credentials: "include", body: form });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "No se pudo registrar la carga.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Fecha</span>
          <input required type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Vehículo</span>
          <select required value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5">
            <option value="">Selecciona</option>
            {vehicles.filter((item) => item.status === "activo").map((item) => (
              <option key={item.id} value={item.id}>{item.code ? `${item.code} · ` : ""}{item.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Kilometraje actual</span>
          <input required type="number" min="0" step="0.1" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Litros cargados</span>
          <input required type="number" min="0.01" step="0.01" value={liters} onChange={(e) => setLiters(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Importe total (MXN)</span>
          <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        <div className="text-sm">
          <p className="mb-1 font-medium text-zinc-700">Precio por litro</p>
          <p className="rounded-xl bg-zinc-50 px-3 py-2.5 font-semibold tabular-nums text-zinc-900">
            {unit == null ? "—" : formatMoney(unit, "MXN")}
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Proveedor / gasolinera</span>
          <input required value={stationName} onChange={(e) => setStationName(e.target.value)} placeholder="Pemex, Shell…" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Tarjeta empresarial</span>
          <select required value={companyCardId} onChange={(e) => setCompanyCardId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5">
            <option value="">Selecciona</option>
            {cards.map((card) => (
              <option key={card.id} value={card.id}>{card.label}</option>
            ))}
          </select>
        </label>
      </div>
      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium text-zinc-700">Obra / centro de costo</legend>
        {(
          [
            ["obra", "Obra"],
            ["oficinas", "Oficinas / Administración"],
            ["otro", "Otro centro de costo"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" checked={destinationKind === value} onChange={() => setDestinationKind(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      {destinationKind === "obra" && (
        <select required value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm">
          <option value="">Selecciona la obra</option>
          {obras.filter((obra) => obra.active).map((obra) => (
            <option key={obra.id} value={obra.id}>{obra.name}</option>
          ))}
        </select>
      )}
      {destinationKind === "otro" && (
        <input required value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="Centro de costo" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm" />
      )}
      <fieldset className="space-y-2 text-sm">
        <legend className="font-medium text-zinc-700">Comprobante</legend>
        {(
          [
            ["factura", "Factura (PDF + XML)"],
            ["ticket", "Ticket (foto o PDF)"],
            ["sin_comprobante", "Sin comprobante"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" checked={receiptKind === value} onChange={() => setReceiptKind(value)} />
            {label}
          </label>
        ))}
      </fieldset>
      {receiptKind === "factura" && (
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <label>PDF<input required type="file" accept="application/pdf,.pdf" onChange={(e) => setPdf(e.target.files?.[0] ?? null)} /></label>
          <label>XML<input required type="file" accept=".xml,text/xml,application/xml" onChange={(e) => setXml(e.target.files?.[0] ?? null)} /></label>
        </div>
      )}
      {receiptKind === "ticket" && (
        <label className="block text-sm">Foto o PDF
          <input required type="file" accept="image/jpeg,image/png,image/webp,.pdf,application/pdf" onChange={(e) => setTicket(e.target.files?.[0] ?? null)} />
        </label>
      )}
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-700">Observaciones</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
      </label>
      {receiptKind === "sin_comprobante" && (
        <p className="text-sm text-amber-800">La carga se registra como gasto y queda marcada como sin comprobante.</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Guardando…" : "Registrar carga"}
      </button>
    </form>
  );
}
