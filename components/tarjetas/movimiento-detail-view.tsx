"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb";
import { useFeedback } from "@/components/ui/feedback-provider";
import { MovimientoForm } from "@/components/tarjetas/movimiento-form";
import type { CompanyCardDto, CompanyCardMovementDto, EmployeeDto, ObraDto, Role } from "@/lib/domain/types";
import { formatDate, formatMoney } from "@/lib/format";
import { cardSubtitle } from "@/lib/tarjetas/summary";

const money = (amount: number) => formatMoney(amount, "MXN");

function fileHref(id: string, download = false) {
  return `/api/company-card-files/${id}${download ? "?download=1" : ""}`;
}

function isImage(mime: string, name: string) {
  return mime.startsWith("image/") || /\.(jpe?g|png)$/i.test(name);
}

export function MovimientoDetailView({ movementId }: { movementId: string }) {
  const router = useRouter();
  const { showSuccess, showError } = useFeedback();
  const [movement, setMovement] = useState<CompanyCardMovementDto | null>(null);
  const [cards, setCards] = useState<CompanyCardDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [obras, setObras] = useState<ObraDto[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; role: Role }[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [mRes, cRes, eRes, oRes, uRes] = await Promise.all([
      fetch(`/api/company-cards/movements/${movementId}`, { credentials: "include" }),
      fetch("/api/company-cards", { credentials: "include" }),
      fetch("/api/employees", { credentials: "include" }),
      fetch("/api/obras", { credentials: "include" }),
      fetch("/api/users", { credentials: "include" }),
    ]);
    if (mRes.ok) setMovement(((await mRes.json()) as { movement: CompanyCardMovementDto }).movement);
    else setMovement(null);
    if (cRes.ok) setCards(((await cRes.json()) as { cards: CompanyCardDto[] }).cards);
    if (eRes.ok) setEmployees(((await eRes.json()) as { employees: EmployeeDto[] }).employees);
    if (oRes.ok) setObras(((await oRes.json()) as { obras: ObraDto[] }).obras);
    if (uRes.ok) setUsers(((await uRes.json()) as { users: { id: string; name: string; role: Role }[] }).users);
    setLoading(false);
  }, [movementId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove() {
    const res = await fetch(`/api/company-cards/movements/${movementId}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      showError(data?.error ?? "No se pudo quitar el movimiento.");
      return;
    }
    showSuccess("Movimiento eliminado.");
    router.push(movement?.cardId ? `/tarjetas/${movement.cardId}` : "/tarjetas");
  }

  if (loading) return <LoadingScreen message="Cargando movimiento" />;
  if (!movement) {
    return (
      <PageBreadcrumb
        items={[
          { label: "Inicio", href: "/inicio" },
          { label: "Tarjetas", href: "/tarjetas" },
        ]}
      />
    );
  }

  const rows = [
    ["Fecha", formatDate(movement.occurredOn)],
    ["Tarjeta", cardSubtitle(movement.cardLabel, movement.cardLastFour) ? `${movement.cardLabel} (${cardSubtitle(movement.cardLabel, movement.cardLastFour)})` : movement.cardLabel],
    ["Importe", money(movement.amount)],
    ["Tipo", movement.kind === "carga" ? "Carga de saldo" : "Gasto"],
  ];
  if (movement.kind === "gasto") {
    rows.push(
      ["Proveedor", movement.supplierName],
      ["Concepto", movement.concept],
      ["Categoría", movement.category],
      ["Destino", movement.destinationLabel],
      ["Responsable", movement.responsibleName],
      ["Comprobante", movement.receiptLabel],
      ["Estatus", movement.statusLabel]
    );
  } else {
    rows.push(["Nota", movement.concept]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageBreadcrumb
            items={[
              { label: "Inicio", href: "/inicio" },
              { label: "Tarjetas", href: "/tarjetas" },
              { label: movement.cardLabel, href: `/tarjetas/${movement.cardId}` },
              { label: movement.kind === "carga" ? "Carga de saldo" : movement.concept },
            ]}
          />
          <h1 className="mt-1 text-2xl font-bold text-zinc-900">{movement.kind === "carga" ? "Carga de saldo" : movement.concept}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing((value) => !value)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold">
            {editing ? "Cerrar edición" : "Editar"}
          </button>
          <button type="button" onClick={() => void remove()} className="rounded-xl px-4 py-2 text-sm font-semibold text-red-600">Quitar</button>
        </div>
      </div>

      <dl className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-zinc-900">{value}</dd>
          </div>
        ))}
      </dl>

      {movement.receiptKind === "sin_comprobante" && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-semibold">Observación: </span>
          {movement.missingReceiptReason}
        </p>
      )}

      {movement.files.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {movement.files.map((file) => (
            <div key={file.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {isImage(file.mimeType, file.originalFileName) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileHref(file.id)} alt={file.originalFileName} className="max-h-64 w-full object-contain bg-zinc-50" />
              )}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <p className="truncate text-sm font-medium">{file.originalFileName}</p>
                <div className="flex shrink-0 gap-3 text-sm font-medium">
                  <a href={fileHref(file.id)} target="_blank" rel="noreferrer" className="text-orange-700">Ver</a>
                  <a href={fileHref(file.id, true)} className="text-zinc-600">Descargar</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-bold">Editar movimiento</h2>
          <MovimientoForm
            cards={cards}
            users={users}
            employees={employees}
            obras={obras}
            movement={movement}
            onDone={() => {
              setEditing(false);
              showSuccess("Movimiento actualizado.");
              void load();
            }}
          />
        </div>
      )}
    </div>
  );
}
