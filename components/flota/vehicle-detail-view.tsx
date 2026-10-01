"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useFeedback } from "@/components/ui/feedback-provider";
import { VehiclePhoto } from "@/components/flota/vehicle-photo";
import { FuelLoadForm } from "@/components/flota/fuel-load-form";
import { VehiculoForm } from "@/components/flota/vehiculo-form";
import { useSession } from "@/components/session-provider";
import { canEditVehicleProfile } from "@/lib/flota/access";
import type { VehicleDto } from "@/components/flota/types";
import { vehicleTitle } from "@/components/flota/types";
import type { CompanyCardDto, ObraDto } from "@/lib/domain/types";
import { DOCUMENT_KINDS } from "@/lib/flota/dates";
import { formatDate, formatMoney } from "@/lib/format";

const money = (n: number) => formatMoney(n, "MXN");
const TABS = ["resumen", "combustible", "mantenimiento", "documentos", "gastos", "financiamiento", "historial"] as const;

function todayMx() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

export function VehicleDetailView({ vehicleId }: { vehicleId: string }) {
  const params = useSearchParams();
  const { user } = useSession();
  const canEdit = Boolean(user && canEditVehicleProfile(user));
  const { showError, showSuccess } = useFeedback();
  const initial = params.get("tab");
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS.includes(initial as (typeof TABS)[number]) ? (initial as (typeof TABS)[number]) : "resumen");
  const [vehicle, setVehicle] = useState<VehicleDto | null>(null);
  const [vehicles, setVehicles] = useState<VehicleDto[]>([]);
  const [cards, setCards] = useState<CompanyCardDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuelOpen, setFuelOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [vRes, allRes, cRes, oRes] = await Promise.all([
      fetch(`/api/vehicles/${vehicleId}`, { credentials: "include" }),
      fetch("/api/vehicles", { credentials: "include" }),
      fetch("/api/company-cards", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
    ]);
    if (vRes.ok) setVehicle(((await vRes.json()) as { vehicle: VehicleDto }).vehicle);
    else setVehicle(null);
    if (allRes.ok) setVehicles(((await allRes.json()) as { vehicles: VehicleDto[] }).vehicles);
    if (cRes.ok) setCards(((await cRes.json()) as { cards: CompanyCardDto[] }).cards);
    if (oRes.ok) setObras(((await oRes.json()) as { obras: ObraDto[] }).obras);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { void load(); }, [load]);

  async function send(body: Record<string, unknown>, success = "Guardado.") {
    const res = await fetch(`/api/vehicles/${vehicleId}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string; vehicle?: VehicleDto } | null;
    if (!res.ok || !data?.vehicle) {
      showError(data?.error ?? "No se pudo guardar.");
      return;
    }
    setVehicle(data.vehicle);
    showSuccess(success);
  }

  if (loading) return <LoadingScreen message="Cargando vehículo" />;
  if (!vehicle) return <Link href="/vehiculos" className="text-sm font-semibold text-orange-700">Volver al listado</Link>;

  const upcomingDocs = vehicle.documents.filter((doc) => doc.tone === "proximo" || doc.tone === "vencido");
  const upcomingJobs = vehicle.maintenances.filter((job) => job.upcoming && !job.completedOn);

  return (
    <div className="space-y-5">
      <Link href="/vehiculos" className="text-sm font-medium text-orange-700">Volver al listado</Link>
      <div className="flex flex-wrap gap-4 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="h-28 w-40 overflow-hidden rounded-xl bg-zinc-100">
          {vehicle.hasPhoto && <VehiclePhoto id={vehicle.id} alt={vehicle.name} width={320} height={200} sizes="160px" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-zinc-900">{vehicleTitle(vehicle)}</h1>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">{vehicle.status === "activo" ? "Activo" : "Baja"}</span>
          </div>
          <p className="text-sm text-zinc-500">Placas: {vehicle.plates || "—"}</p>
          {canEdit && (
            <button type="button" onClick={() => setEditing((open) => !open)} className="mt-2 rounded-xl border border-orange-200 px-3 py-1.5 text-sm font-semibold text-orange-800">
              {editing ? "Cerrar edición" : "Editar datos"}
            </button>
          )}
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Info label="Tipo" value={vehicle.vehicleType || "—"} />
            <Info label="Color" value={vehicle.color || "—"} />
            <Info label="Propietario" value={vehicle.ownerName || "—"} />
            <Info label="Número de serie" value={vehicle.vin || "—"} />
            <Info label="Número de motor" value={vehicle.engineNumber || "—"} />
          </dl>
        </div>
      </div>

      {editing && canEdit && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-bold text-zinc-900">Editar vehículo</h2>
          <VehiculoForm
            key={vehicle.id}
            vehicle={vehicle}
            onDone={() => {
              setEditing(false);
              showSuccess("Datos del vehículo actualizados.");
              void load();
            }}
          />
        </section>
      )}

      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize ${tab === item ? "bg-zinc-900 text-white" : "bg-white text-zinc-600"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Kilometraje actual" value={`${vehicle.currentKm.toLocaleString("es-MX")} km`} />
          <Metric label="Combustible del mes" value={money(vehicle.fuel.monthAmount)} />
          <Metric label="Combustible del año" value={money(vehicle.fuel.yearAmount)} />
          <Metric label="Litros del año" value={`${vehicle.fuel.yearLiters.toLocaleString("es-MX")} L`} />
          <Metric label="Rendimiento promedio" value={vehicle.fuel.avgKmPerLiter == null ? "—" : `${vehicle.fuel.avgKmPerLiter} km/L`} />
          <Metric label="Último gasto" value={vehicle.fuel.last ? `${money(vehicle.fuel.last.amount)} · ${formatDate(vehicle.fuel.last.occurredOn)}` : "—"} />
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:col-span-2 xl:col-span-3">
            <h2 className="font-bold text-zinc-900">Próximos vencimientos y mantenimientos</h2>
            {upcomingDocs.length === 0 && upcomingJobs.length === 0 ? <p className="mt-2 text-sm text-zinc-500">Nada próximo.</p> : (
              <ul className="mt-2 space-y-1 text-sm">
                {upcomingDocs.map((doc) => <li key={doc.id}>{doc.name}: {doc.tone === "vencido" ? "vencido" : "próximo"} {doc.expiresOn ? formatDate(doc.expiresOn) : ""}</li>)}
                {upcomingJobs.map((job) => <li key={job.id}>{job.title}{job.dueOn ? ` · ${formatDate(job.dueOn)}` : ""}{job.dueKm ? ` · ${job.dueKm} km` : ""}</li>)}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "combustible" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button type="button" onClick={() => setFuelOpen(true)} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Registrar carga</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Este mes" value={money(vehicle.fuel.monthAmount)} />
            <Metric label="Este año" value={money(vehicle.fuel.yearAmount)} />
            <Metric label="Litros del año" value={`${vehicle.fuel.yearLiters} L`} />
            <Metric label="Precio promedio" value={vehicle.fuel.avgPrice == null ? "—" : `${money(vehicle.fuel.avgPrice)} / L`} />
            <Metric label="Rendimiento" value={vehicle.fuel.avgKmPerLiter == null ? "—" : `${vehicle.fuel.avgKmPerLiter} km/L`} />
          </div>
          <LoadTable loads={vehicle.fuelLoads} />
          {fuelOpen && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-900/40 p-4 sm:items-center">
              <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5">
                <button type="button" className="mb-3 text-sm text-zinc-500" onClick={() => setFuelOpen(false)}>Cerrar</button>
                <FuelLoadForm vehicles={vehicles.length ? vehicles : [vehicle]} cards={cards} obras={obras} presetVehicleId={vehicle.id} onDone={() => { setFuelOpen(false); void load(); }} />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "mantenimiento" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MiniForm
            title="Nuevo servicio"
            fields={[
              { name: "title", label: "Servicio" },
              { name: "dueOn", label: "Fecha", type: "date" },
              { name: "dueKm", label: "Kilometraje", type: "number" },
              { name: "notes", label: "Notas" },
            ]}
            onSubmit={(values) => void send({ action: "maintenance", ...values })}
          />
          <ul className="space-y-2">
            {vehicle.maintenances.map((job) => (
              <li key={job.id} className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm">
                <p className="font-semibold">{job.title}</p>
                <p className="text-zinc-500">{job.dueOn ? formatDate(job.dueOn) : "Sin fecha"}{job.dueKm ? ` · ${job.dueKm} km` : ""}</p>
                {job.completedOn ? <p className="text-teal-800">Hecho {formatDate(job.completedOn)}</p> : (
                  <button type="button" className="mt-1 text-orange-700" onClick={() => void send({ action: "complete-maintenance", maintenanceId: job.id, completedOn: todayMx() })}>Marcar hecho</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "documentos" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MiniForm
            title="Agregar documento"
            fields={[
              { name: "kind", label: "Tipo", options: DOCUMENT_KINDS.map((item) => ({ value: item.kind, label: item.label })) },
              { name: "name", label: "Nombre" },
              { name: "expiresOn", label: "Vence", type: "date" },
            ]}
            onSubmit={(values) => void send({ action: "document", ...values })}
          />
          <ul className="space-y-2">
            {vehicle.documents.map((doc) => (
              <li key={doc.id} className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>{doc.name}{doc.expiresOn ? ` · ${formatDate(doc.expiresOn)}` : ""}</span>
                  <span className="shrink-0">{doc.tone === "vencido" ? "Vencido" : doc.tone === "proximo" ? "Próximo" : doc.tone === "vigente" ? "Vigente" : "Sin fecha"}</span>
                </div>
                {editingDocId === doc.id ? (
                  <DocumentEditor
                    doc={doc}
                    onCancel={() => setEditingDocId(null)}
                    onSave={(values) => {
                      setEditingDocId(null);
                      void send({ action: "update-document", documentId: doc.id, ...values }, "Documento actualizado.");
                    }}
                  />
                ) : (
                  <div className="mt-2 flex gap-3">
                    <button type="button" className="font-semibold text-orange-700" onClick={() => setEditingDocId(doc.id)}>Editar</button>
                    <button
                      type="button"
                      className="font-semibold text-red-700"
                      onClick={() => {
                        if (!window.confirm(`¿Borrar “${doc.name}”?`)) return;
                        void send({ action: "delete-document", documentId: doc.id }, "Documento eliminado.");
                      }}
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "gastos" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MiniForm
            title="Otro gasto"
            fields={[
              { name: "occurredOn", label: "Fecha", type: "date" },
              { name: "concept", label: "Concepto" },
              { name: "amount", label: "Monto", type: "number" },
              { name: "notes", label: "Notas" },
            ]}
            onSubmit={(values) => void send({ action: "expense", ...values })}
          />
          <ul className="space-y-2">
            {vehicle.expenses.map((item) => (
              <li key={item.id} className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm">
                {formatDate(item.occurredOn)} · {item.concept} · {money(item.amount)}
              </li>
            ))}
            {vehicle.expenses.length === 0 && <p className="text-sm text-zinc-500">El combustible se consulta en su pestaña. Aquí van casetas, refacciones u otros gastos.</p>}
          </ul>
        </div>
      )}

      {tab === "financiamiento" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <MiniForm
            key={`${vehicle.financing?.id ?? "nuevo"}-${vehicle.financing?.paidInstallments ?? 0}-${vehicle.financing?.monthlyPayment ?? 0}`}
            title={vehicle.financing ? "Actualizar crédito" : "Registrar crédito o arrendamiento"}
            defaults={vehicle.financing ? {
              kind: vehicle.financing.kind,
              institution: vehicle.financing.institution,
              termMonths: String(vehicle.financing.termMonths),
              monthlyPayment: String(vehicle.financing.monthlyPayment),
              paidInstallments: String(vehicle.financing.paidInstallments),
              nextPaymentOn: toDayInput(vehicle.financing.nextPaymentOn),
            } : { kind: "credito", termMonths: "36", paidInstallments: "0" }}
            fields={[
              { name: "kind", label: "Tipo", options: [{ value: "credito", label: "Crédito" }, { value: "arrendamiento", label: "Arrendamiento" }] },
              { name: "institution", label: "Institución" },
              { name: "termMonths", label: "Plazo (pagos)", type: "number" },
              { name: "monthlyPayment", label: "Pago mensual", type: "number" },
              { name: "paidInstallments", label: "Pagos realizados", type: "number" },
              { name: "nextPaymentOn", label: "Próximo pago", type: "date" },
            ]}
            onSubmit={(values) => void send({ action: "financing", ...values })}
          />
          <div className="space-y-3">
            {vehicle.financing && (
              <>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
                  <p className="font-semibold">{vehicle.financing.institution}</p>
                  <p>{vehicle.financing.kind === "arrendamiento" ? "Arrendamiento" : "Crédito"} · {vehicle.financing.paid} / {vehicle.financing.termMonths} pagos</p>
                  <p>Pago mensual {money(vehicle.financing.monthlyPayment)}</p>
                  <p>Saldo pagado {money(vehicle.financing.paidAmount)}</p>
                  <p>Saldo por pagar {money(vehicle.financing.remainingAmount)} · faltan {vehicle.financing.remainingCount} pagos</p>
                  <p>Próximo pago {vehicle.financing.nextPaymentOn ? formatDate(vehicle.financing.nextPaymentOn) : "—"}</p>
                </div>
                <MiniForm title="Registrar pago" fields={[{ name: "paidOn", label: "Fecha", type: "date" }, { name: "amount", label: "Monto", type: "number" }, { name: "notes", label: "Notas" }]} onSubmit={(values) => void send({ action: "payment", ...values })} />
                <ul className="space-y-1 text-sm">
                  {vehicle.financing.payments.map((payment) => (
                    <li key={payment.id}>{formatDate(payment.paidOn)} · {money(payment.amount)} {payment.notes}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <ul className="space-y-2">
          {[
            ...vehicle.fuelLoads.map((load) => ({ at: load.occurredOn, text: `Carga ${load.liters} L · ${money(load.amount)} · ${load.stationName}` })),
            ...vehicle.maintenances.filter((job) => job.completedOn).map((job) => ({ at: job.completedOn as string, text: `Mantenimiento: ${job.title}` })),
            ...vehicle.expenses.map((item) => ({ at: item.occurredOn, text: `Gasto: ${item.concept} · ${money(item.amount)}` })),
            ...(vehicle.financing?.payments ?? []).map((payment) => ({ at: payment.paidOn, text: `Pago de financiamiento · ${money(payment.amount)}` })),
          ]
            .sort((a, b) => b.at.localeCompare(a.at))
            .map((item, index) => (
              <li key={index} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">
                <span className="text-zinc-500">{formatDate(item.at)}</span> · {item.text}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] uppercase text-zinc-500">{label}</dt><dd className="font-medium text-zinc-900">{value}</dd></div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-[11px] font-semibold uppercase text-zinc-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></article>;
}
function LoadTable({ loads }: { loads: VehicleDto["fuelLoads"] }) {
  if (loads.length === 0) return <p className="text-sm text-zinc-500">Este vehículo todavía no tiene cargas.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>{["Fecha", "Km", "Litros", "Importe", "Gasolinera", "Tarjeta", "Comprobante"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {loads.map((load) => (
            <tr key={load.id}>
              <td className="px-3 py-2">{formatDate(load.occurredOn)}</td>
              <td className="px-3 py-2 tabular-nums">{load.odometerKm.toLocaleString("es-MX")}</td>
              <td className="px-3 py-2 tabular-nums">{load.liters}</td>
              <td className="px-3 py-2 tabular-nums">{money(load.amount)}</td>
              <td className="px-3 py-2">{load.stationName}</td>
              <td className="px-3 py-2">{load.cardLabel}</td>
              <td className="px-3 py-2">
                {load.receiptKind === "sin_comprobante" ? "Sin comprobante" : load.files.some((file) => !file.purged) ? load.files.filter((file) => !file.purged).map((file) => (
                  <a key={file.id} className="mr-2 text-orange-700" href={`/api/fuel-load-files/${file.id}`} target="_blank" rel="noreferrer">Ver</a>
                )) : "Archivo vencido"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toDayInput(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date(iso));
}

function DocumentEditor({
  doc,
  onCancel,
  onSave,
}: {
  doc: VehicleDto["documents"][number];
  onCancel: () => void;
  onSave: (values: { kind: string; name: string; expiresOn: string }) => void;
}) {
  const [kind, setKind] = useState(doc.kind || "seguro");
  const [name, setName] = useState(doc.name);
  const [expiresOn, setExpiresOn] = useState(toDayInput(doc.expiresOn));
  return (
    <form
      className="mt-3 grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ kind, name, expiresOn });
      }}
    >
      <label className="block text-sm">
        Tipo
        <select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2">
          {DOCUMENT_KINDS.map((item) => (
            <option key={item.kind} value={item.kind}>{item.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Nombre
        <input value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
      </label>
      <label className="block text-sm">
        Vence
        <input type="date" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">Guardar</button>
        <button type="button" onClick={onCancel} className="rounded-xl border px-3 py-2 text-sm font-semibold text-zinc-700">Cancelar</button>
      </div>
    </form>
  );
}

function MiniForm({
  title,
  fields,
  defaults,
  onSubmit,
}: {
  title: string;
  fields: { name: string; label: string; type?: string; options?: { value: string; label: string }[] }[];
  defaults?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(defaults ?? {});
  return (
    <form className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4" onSubmit={(e) => { e.preventDefault(); onSubmit({ ...defaults, ...values }); if (!defaults) setValues({}); }}>
      <h2 className="font-bold">{title}</h2>
      {fields.map((field) => (
        <label key={field.name} className="block text-sm">
          {field.label}
          {field.options ? (
            <select value={values[field.name] ?? field.options[0]?.value ?? ""} onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2">
              {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input type={field.type ?? "text"} value={values[field.name] ?? ""} onChange={(e) => setValues((current) => ({ ...current, [field.name]: e.target.value }))} className="mt-1 w-full rounded-xl border px-3 py-2" />
          )}
        </label>
      ))}
      <button type="submit" className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white">Guardar</button>
    </form>
  );
}
