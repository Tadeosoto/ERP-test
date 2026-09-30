"use client";

import { useMemo, useState } from "react";
import type { CompanyCardDto, CompanyCardMovementDto, EmployeeDto, ObraDto, Role } from "@/lib/domain/types";
import { ROLE_LABEL } from "@/lib/domain/labels";
import { CARD_CATEGORIES, cardSubtitle, occurredOnInputValue } from "@/lib/tarjetas/summary";

type UserOption = { id: string; name: string; role: Role };

function todayMx(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

function inputDate(iso?: string): string {
  if (!iso) return todayMx();
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date(iso));
}

export function MovimientoForm({
  cards,
  users,
  employees,
  obras,
  movement,
  presetCardId,
  onDone,
}: {
  cards: CompanyCardDto[];
  users: UserOption[];
  employees: EmployeeDto[];
  obras: ObraDto[];
  movement?: CompanyCardMovementDto | null;
  presetCardId?: string;
  onDone: () => void;
}) {
  const [cardId, setCardId] = useState(movement?.cardId ?? presetCardId ?? "");
  const [kind, setKind] = useState(movement?.kind ?? "gasto");
  const [occurredOn, setOccurredOn] = useState(movement ? inputDate(movement.occurredOn) : todayMx());
  const [amount, setAmount] = useState(movement ? String(movement.amount) : "");
  const [supplierName, setSupplierName] = useState(movement?.supplierName ?? "");
  const [concept, setConcept] = useState(movement?.concept ?? "");
  const [category, setCategory] = useState(movement?.category ?? "");
  const [destinationKind, setDestinationKind] = useState(movement?.destinationKind || "obra");
  const [obraId, setObraId] = useState(movement?.obraId ?? "");
  const [costCenter, setCostCenter] = useState(movement?.costCenter ?? "");
  const [responsible, setResponsible] = useState(
    movement?.responsibleUserId
      ? `user:${movement.responsibleUserId}`
      : movement?.responsibleEmployeeId
        ? `employee:${movement.responsibleEmployeeId}`
        : ""
  );
  const [receiptKind, setReceiptKind] = useState(movement?.receiptKind || "ticket");
  const [reason, setReason] = useState(movement?.missingReceiptReason ?? "");
  const [status, setStatus] = useState(movement?.status === "comprobado" || movement?.status === "por_comprobar" ? movement.status : "por_comprobar");
  const [pdf, setPdf] = useState<File | null>(null);
  const [xml, setXml] = useState<File | null>(null);
  const [ticket, setTicket] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const card = cards.find((item) => item.id === cardId);
  const isLoad = kind === "carga" && card?.kind === "debito";
  const employeeOptions = useMemo(
    () => employees.filter((employee) => employee.active || employee.id === movement?.responsibleEmployeeId),
    [employees, movement?.responsibleEmployeeId]
  );
  const obraOptions = useMemo(
    () => obras.filter((obra) => obra.active || obra.id === movement?.obraId),
    [movement?.obraId, obras]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const form = new FormData();
    form.set("cardId", cardId);
    form.set("kind", card?.kind === "credito" ? "gasto" : kind);
    form.set("occurredOn", occurredOn || occurredOnInputValue(new Date()));
    form.set("amount", amount);
    form.set("concept", isLoad ? concept || "Carga de saldo" : concept);
    if (!isLoad) {
      const [responsibleKind, responsibleId] = responsible.split(":");
      form.set("supplierName", supplierName);
      form.set("category", category);
      form.set("destinationKind", destinationKind);
      form.set("obraId", obraId);
      form.set("costCenter", costCenter);
      form.set("responsibleKind", responsibleKind ?? "");
      form.set("responsibleId", responsibleId ?? "");
      form.set("receiptKind", receiptKind);
      form.set("missingReceiptReason", reason);
      form.set("status", status);
      if (receiptKind === "factura") {
        if (pdf) form.append("files", pdf);
        if (xml) form.append("files", xml);
      }
      if (receiptKind === "ticket" && ticket) form.append("files", ticket);
    }
    setSaving(true);
    const res = await fetch(movement ? `/api/company-cards/movements/${movement.id}` : "/api/company-cards/movements", {
      method: movement ? "PATCH" : "POST",
      credentials: "include",
      body: form,
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setSaving(false);
    if (!res.ok) {
      setError(data?.error ?? "No se pudo guardar el movimiento.");
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Tarjeta</span>
          <select required value={cardId} onChange={(e) => setCardId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5">
            <option value="">Selecciona</option>
            {cards.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {cardSubtitle(item.label, item.lastFour) ? ` (${cardSubtitle(item.label, item.lastFour)})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Fecha</span>
          <input required type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Monto (MXN)</span>
          <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
        {card?.kind === "debito" && (
          <fieldset className="text-sm">
            <legend className="mb-1 font-medium text-zinc-700">Tipo de movimiento</legend>
            <label className="mr-4 inline-flex items-center gap-2">
              <input type="radio" checked={kind === "gasto"} onChange={() => setKind("gasto")} />
              Gasto
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={kind === "carga"} onChange={() => setKind("carga")} />
              Carga de saldo
            </label>
          </fieldset>
        )}
      </div>

      {isLoad ? (
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Nota</span>
          <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Carga de saldo" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
        </label>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Proveedor</span>
              <input required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Concepto</span>
              <input required value={concept} onChange={(e) => setConcept(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Categoría</span>
              <select required value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5">
                <option value="">Selecciona</option>
                {CARD_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Responsable</span>
              <select required value={responsible} onChange={(e) => setResponsible(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5">
                <option value="">Selecciona</option>
                <optgroup label="Usuarios">
                  {users.map((user) => (
                    <option key={user.id} value={`user:${user.id}`}>
                      {user.name} · {ROLE_LABEL[user.role]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Empleados">
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={`employee:${employee.id}`}>
                      {employee.fullName}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-zinc-700">Destino del gasto</legend>
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
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Obra</span>
              <select required value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5">
                <option value="">Selecciona</option>
                {obraOptions.map((obra) => (
                  <option key={obra.id} value={obra.id}>{obra.name}</option>
                ))}
              </select>
            </label>
          )}
          {destinationKind === "otro" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Centro de costo</span>
              <input required value={costCenter} onChange={(e) => setCostCenter(e.target.value)} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
            </label>
          )}
          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-zinc-700">Comprobante de este movimiento</legend>
            {(
              [
                ["factura", "Factura (PDF + XML)"],
                ["ticket", "Ticket (JPG, PNG o PDF)"],
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">PDF {movement?.files.length ? "(reemplaza el anterior si lo eliges)" : ""}</span>
                <input type="file" accept="application/pdf,.pdf" required={!movement?.files.length} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">XML</span>
                <input type="file" accept=".xml,text/xml,application/xml" required={!movement?.files.length} onChange={(e) => setXml(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}
          {receiptKind === "ticket" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">JPG, PNG o PDF</span>
              <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png,application/pdf,.pdf" required={!movement?.files.length} onChange={(e) => setTicket(e.target.files?.[0] ?? null)} />
            </label>
          )}
          {receiptKind === "sin_comprobante" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-700">Observación</span>
              <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full rounded-xl border border-zinc-200 px-3 py-2.5" />
            </label>
          )}
          <fieldset className="space-y-2 text-sm">
            <legend className="font-medium text-zinc-700">Estatus</legend>
            <label className="mr-4 inline-flex items-center gap-2">
              <input type="radio" checked={status === "por_comprobar"} onChange={() => setStatus("por_comprobar")} />
              Por comprobar
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" checked={status === "comprobado"} onChange={() => setStatus("comprobado")} />
              Comprobado
            </label>
          </fieldset>
        </>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
        {saving ? "Guardando…" : movement ? "Guardar cambios" : "Registrar movimiento"}
      </button>
    </form>
  );
}
