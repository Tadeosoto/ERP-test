"use client";

import { useState } from "react";
import { FilePickButton } from "@/components/file-pick-button";
import { VEHICLE_TYPES, DOCUMENT_KINDS } from "@/lib/flota/dates";
import { financingProgress } from "@/lib/flota/financing";
import { formatMoney } from "@/lib/format";

type DocDraft = { kind: string; name: string; expiresOn: string };

type VehicleProfile = {
  id: string;
  code: string;
  name: string;
  year: number | null;
  plates: string;
  vehicleType: string;
  color: string;
  vin: string;
  engineNumber: string;
  ownerName: string;
  currentKm: number;
  status: string;
};

export function VehiculoForm({
  onDone,
  vehicle,
}: {
  onDone: (id: string) => void;
  vehicle?: VehicleProfile | null;
}) {
  const editing = Boolean(vehicle);
  const [code, setCode] = useState(vehicle?.code ?? "");
  const [name, setName] = useState(vehicle?.name ?? "");
  const [year, setYear] = useState(vehicle?.year != null ? String(vehicle.year) : "");
  const [plates, setPlates] = useState(vehicle?.plates ?? "");
  const [vehicleType, setVehicleType] = useState(vehicle?.vehicleType || "Pick-up");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [vin, setVin] = useState(vehicle?.vin ?? "");
  const [engineNumber, setEngineNumber] = useState(vehicle?.engineNumber ?? "");
  const [ownerName, setOwnerName] = useState(vehicle?.ownerName || "Consorcio Constructor Profesional");
  const [currentKm, setCurrentKm] = useState(vehicle ? String(vehicle.currentKm) : "");
  const [image, setImage] = useState<File | null>(null);
  const [financeKind, setFinanceKind] = useState("credito");
  const [financeInstitution, setFinanceInstitution] = useState("");
  const [financeTerm, setFinanceTerm] = useState("36");
  const [financeMonthly, setFinanceMonthly] = useState("");
  const [financePaid, setFinancePaid] = useState("");
  const [financeNext, setFinanceNext] = useState("");
  const [docs, setDocs] = useState<DocDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addDoc() {
    setDocs((current) => [...current, { kind: "seguro", name: "Seguro", expiresOn: "" }]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const form = new FormData();
    form.set("code", code);
    form.set("name", name);
    form.set("year", year);
    form.set("plates", plates);
    form.set("vehicleType", vehicleType);
    form.set("color", color);
    form.set("vin", vin);
    form.set("engineNumber", engineNumber);
    form.set("ownerName", ownerName);
    form.set("currentKm", currentKm);
    form.set("documents", JSON.stringify(docs));
    form.set("financeKind", financeKind);
    form.set("financeInstitution", financeInstitution);
    form.set("financeTerm", financeTerm);
    form.set("financeMonthly", financeMonthly);
    form.set("financePaid", financePaid);
    form.set("financeNext", financeNext);
    if (image) form.set("image", image);
    setSaving(true);
    if (editing && vehicle) {
      const res = await fetch(`/api/vehicles/${vehicle.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name,
          year,
          plates,
          vehicleType,
          color,
          vin,
          engineNumber,
          ownerName,
          currentKm,
          status: vehicle.status,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; vehicle?: { id: string } } | null;
      if (!res.ok || !data?.vehicle) {
        setSaving(false);
        setError(data?.error ?? "No se pudieron guardar los cambios.");
        return;
      }
      if (image) {
        const photo = new FormData();
        photo.set("image", image);
        const photoRes = await fetch(`/api/vehicles/${vehicle.id}/photo`, {
          method: "POST",
          credentials: "include",
          body: photo,
        });
        if (!photoRes.ok) {
          const photoData = (await photoRes.json().catch(() => null)) as { error?: string } | null;
          setSaving(false);
          setError(photoData?.error ?? "Los datos se guardaron, pero la foto no.");
          return;
        }
      }
      setSaving(false);
      onDone(data.vehicle.id);
      return;
    }
    const res = await fetch("/api/vehicles", { method: "POST", credentials: "include", body: form });
    const data = (await res.json().catch(() => null)) as { error?: string; vehicle?: { id: string } } | null;
    setSaving(false);
    if (!res.ok || !data?.vehicle) {
      setError(data?.error ?? "No se pudo registrar el vehículo.");
      return;
    }
    onDone(data.vehicle.id);
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">Código<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="C-04" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Vehículo<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Toyota Hilux" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Año<input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Placas<input value={plates} onChange={(e) => setPlates(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Tipo
          <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
            {VEHICLE_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-sm">Color<input value={color} onChange={(e) => setColor(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Propietario<input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Número de serie<input value={vin} onChange={(e) => setVin(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Número de motor<input value={engineNumber} onChange={(e) => setEngineNumber(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-sm">Kilometraje actual<input type="number" min="0" value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <div className="text-sm">
          <p className="mb-1">Foto del vehículo</p>
          <FilePickButton accept="image/*" label="Subir foto" hint="elegir imagen" onPick={setImage} />
        </div>
      </div>
      {!editing && (
        <div className="space-y-3 rounded-2xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-zinc-800">Financiamiento (opcional)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Tipo
              <select value={financeKind} onChange={(e) => setFinanceKind(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
                <option value="credito">Crédito</option>
                <option value="arrendamiento">Arrendamiento</option>
              </select>
            </label>
            <label className="text-sm">Institución<input value={financeInstitution} onChange={(e) => setFinanceInstitution(e.target.value)} placeholder="NR Finance" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
            <label className="text-sm">Plazo (pagos)<input type="number" min="1" value={financeTerm} onChange={(e) => setFinanceTerm(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
            <label className="text-sm">Pago mensual<input type="number" min="0" step="0.01" value={financeMonthly} onChange={(e) => setFinanceMonthly(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
            <label className="text-sm">Pagos que ya llevan<input type="number" min="0" value={financePaid} onChange={(e) => setFinancePaid(e.target.value)} placeholder="10" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
            <label className="text-sm">Próximo pago<input type="date" value={financeNext} onChange={(e) => setFinanceNext(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          </div>
          {Number(financeMonthly) > 0 && Number(financeTerm) > 0 && <FinancePreview term={Number(financeTerm)} monthly={Number(financeMonthly)} paid={Number(financePaid) || 0} />}
        </div>
      )}
      {!editing && <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-800">Documentos y vencimiento</p>
          <button type="button" onClick={addDoc} className="text-sm font-semibold text-orange-700">Agregar documento</button>
        </div>
        {docs.map((doc, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-3">
            <select value={doc.kind} onChange={(e) => {
              const kind = e.target.value;
              const label = DOCUMENT_KINDS.find((item) => item.kind === kind)?.label ?? "";
              setDocs((current) => current.map((item, i) => i === index ? { ...item, kind, name: kind === "otro" ? item.name : label } : item));
            }} className="rounded-xl border px-3 py-2 text-sm">
              {DOCUMENT_KINDS.map((item) => <option key={item.kind} value={item.kind}>{item.label}</option>)}
            </select>
            <input value={doc.name} onChange={(e) => setDocs((current) => current.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="Nombre" className="rounded-xl border px-3 py-2 text-sm" />
            <input type="date" value={doc.expiresOn} onChange={(e) => setDocs((current) => current.map((item, i) => i === index ? { ...item, expiresOn: e.target.value } : item))} className="rounded-xl border px-3 py-2 text-sm" />
          </div>
        ))}
      </div>}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar vehículo"}
      </button>
    </form>
  );
}

function FinancePreview({ term, monthly, paid }: { term: number; monthly: number; paid: number }) {
  const progress = financingProgress(term, monthly, paid);
  return (
    <p className="text-sm text-zinc-600">
      {progress.paid} / {term} pagos · Saldo pagado {formatMoney(progress.paidAmount, "MXN")} · Saldo por pagar {formatMoney(progress.remainingAmount, "MXN")} ({progress.remainingCount} pagos)
    </p>
  );
}
