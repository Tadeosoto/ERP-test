"use client";

import Link from "next/link";
import {
  buildActivityHistory,
  EXPEDIENTE_ESTATUS_LABEL,
  EXPEDIENTE_ESTATUS_TONE,
  EXPEDIENTE_PROCESS_STEPS,
  expedienteEstatus,
  expedienteFolioLabel,
  expedienteStepDone,
  isProcesoBExpediente,
  isProcesoCExpediente,
} from "@/lib/dashboard/direccion-expedientes";
import { PAYMENT_TYPE_TEXT, FILE_KIND_LABEL } from "@/lib/domain/labels";
import type { PurchaseOrderDto } from "@/lib/domain/types";
import { formatDateShort, formatMoney } from "@/lib/format";

export function ExpedienteDetailDrawer({
  order,
  onClose,
}: {
  order: PurchaseOrderDto;
  onClose: () => void;
}) {
  const estatus = expedienteEstatus(order);
  const history = buildActivityHistory(order);
  const paymentTotal = order.paymentRecords.length || (order.amountPaidSoFar > 0 ? 1 : 0);
  const paymentSlots = Math.max(paymentTotal, order.paymentType === "parcialidades" ? 2 : 1);
  const procesoB = isProcesoBExpediente(order);
  const procesoC = isProcesoCExpediente(order);
  const detailHref = procesoB
    ? `/solicitudes/gasto/${order.id}`
    : procesoC
      ? `/compromisos-c/${order.id}`
      : `/ordenes/${order.id}`;
  const fileHref = (fileId: string) =>
    procesoB
      ? `/api/solicitud-files/${fileId}?download=1`
      : procesoC
        ? `/api/invoice-first-files/${fileId}?download=1`
        : `/api/files/${fileId}?download=1`;

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/30 lg:hidden"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-[100] flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl lg:sticky lg:top-4 lg:z-0 lg:max-h-[calc(100dvh-6rem)] lg:w-[22rem] lg:shrink-0 lg:rounded-2xl lg:border lg:shadow-lg xl:w-[24rem]"
        aria-label="Detalle del expediente"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900">
                {procesoB || procesoC ? expedienteFolioLabel(order) : order.ocFolio || order.title}
              </h2>
              {procesoB && (
                <span className="inline-flex rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 ring-1 ring-inset ring-teal-200">
                  Proceso B
                </span>
              )}
              {procesoC && (
                <span className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-800 ring-1 ring-inset ring-violet-200">
                  Proceso C
                </span>
              )}
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${EXPEDIENTE_ESTATUS_TONE[estatus]}`}
              >
                {EXPEDIENTE_ESTATUS_LABEL[estatus]}
              </span>
            </div>
            {(procesoB || procesoC) && (
              <p className="mt-1 truncate text-sm font-medium text-zinc-800">{order.title}</p>
            )}
            <p className={`truncate text-sm font-medium text-zinc-800 ${procesoB || procesoC ? "mt-0.5" : "mt-1"}`}>
              {order.supplierName || "Sin proveedor"}
            </p>
            <p className="truncate text-xs text-sky-800">Obra: {order.obraName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cerrar panel"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-100">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Monto total</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-900">
                {formatMoney(order.totalAmount, order.currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Saldo pendiente</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-orange-700">
                {formatMoney(order.amountRemaining, order.currency)}
              </p>
            </div>
          </div>

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Resumen del expediente</h3>
            <div className="mt-3 flex items-center justify-between gap-1">
              {EXPEDIENTE_PROCESS_STEPS.map((step, i) => {
                const done = expedienteStepDone(order, step.key);
                const label = procesoB && step.key === "oc" ? "Sin OC" : step.label;
                return (
                  <div key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                        done ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-500"
                      }`}
                    >
                      {done ? (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="text-center text-[9px] leading-tight text-zinc-600">{label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Información general</h3>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-zinc-500">{procesoB ? "Folio OC" : "Fecha OC"}</dt>
                <dd className="font-medium text-zinc-800">
                  {procesoB
                    ? "Sin folio"
                    : order.ocDate
                      ? formatDateShort(order.ocDate)
                      : formatDateShort(order.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Proveedor</dt>
                <dd className="truncate font-medium text-zinc-800">{order.supplierName || "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">{procesoB ? "Concepto" : "Condición de pago"}</dt>
                <dd className="font-medium text-zinc-800">
                  {procesoB
                    ? order.title
                    : order.paymentType
                      ? PAYMENT_TYPE_TEXT[order.paymentType]
                      : order.paymentTerms || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Responsable</dt>
                <dd className="font-medium text-zinc-800">{order.createdByName || "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Pagos del expediente</h3>
            <ul className="mt-2 space-y-2">
              {order.paymentRecords.length === 0 && order.amountPaidSoFar <= 0 ? (
                <li className="text-xs text-zinc-400">Sin pagos registrados.</li>
              ) : order.paymentRecords.length > 0 ? (
                order.paymentRecords.map((p, i) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs"
                  >
                    <span>
                      <span className="font-semibold text-zinc-800">
                        Pago {i + 1} de {Math.max(order.paymentRecords.length, paymentSlots)}
                      </span>
                      <span className="mt-0.5 block text-emerald-700">Pagado</span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold tabular-nums text-zinc-900">
                        {formatMoney(p.amount, order.currency)}
                      </span>
                      <span className="text-[10px] text-zinc-500">{formatDateShort(p.createdAt)}</span>
                    </span>
                  </li>
                ))
              ) : (
                <li className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 text-xs">
                  <span className="font-semibold text-zinc-800">Pago registrado</span>
                  <span className="font-bold tabular-nums">{formatMoney(order.amountPaidSoFar, order.currency)}</span>
                </li>
              )}
              {order.amountRemaining > 0.01 && (
                <li className="flex items-center justify-between gap-2 rounded-lg border border-orange-100 bg-orange-50/50 px-3 py-2 text-xs">
                  <span className="font-semibold text-orange-900">
                    Pago {order.paymentRecords.length + 1} de {paymentSlots}
                  </span>
                  <span className="text-right">
                    <span className="block font-bold tabular-nums text-orange-800">
                      {formatMoney(order.amountRemaining, order.currency)}
                    </span>
                    <span className="text-[10px] text-orange-600">Pendiente</span>
                  </span>
                </li>
              )}
            </ul>
            <div className="mt-2 flex justify-between text-xs text-zinc-600">
              <span>Total pagado</span>
              <span className="font-semibold tabular-nums text-emerald-700">
                {formatMoney(order.amountPaidSoFar, order.currency)}
              </span>
            </div>
          </section>

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Documentos</h3>
            <ul className="mt-2 space-y-2">
              {order.files.length === 0 ? (
                <li className="text-xs text-zinc-400">Sin documentos cargados.</li>
              ) : (
                <>
                  {order.files.slice(0, 5).map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-zinc-800">
                          {FILE_KIND_LABEL[f.kind] ?? f.originalFileName}
                        </span>
                        <span className="text-[10px] text-zinc-500">{formatDateShort(f.createdAt)}</span>
                      </span>
                      <a
                        href={fileHref(f.id)}
                        className="shrink-0 rounded-lg p-2 text-violet-700 hover:bg-violet-50"
                        title="Descargar"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </a>
                    </li>
                  ))}
                  {order.files.length > 5 && (
                    <li className="px-1 text-[10px] text-zinc-500">
                      +{order.files.length - 5} más en el expediente completo
                    </li>
                  )}
                </>
              )}
            </ul>
          </section>

          <section className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-zinc-500">Historial de actividades</h3>
            <ul className="mt-2 space-y-0 border-l-2 border-violet-100 pl-3">
              {history.slice(0, 8).map((ev, i) => (
                <li key={`${ev.at}-${i}`} className="relative pb-3 text-xs">
                  <span className="absolute -left-[0.69rem] top-1 h-2 w-2 rounded-full bg-violet-400" />
                  <span className="font-semibold text-violet-800">{formatDateShort(ev.at)}</span>
                  <span className="mt-0.5 block text-zinc-600">{ev.message}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-zinc-100 px-4 py-4 sm:flex-row">
          <Link href={detailHref} className="btn-secondary flex-1 justify-center text-sm">
            Ver expediente completo
          </Link>
          <Link
            href={procesoB ? detailHref : `${detailHref}#pagos`}
            className="btn-primary flex-1 justify-center text-sm"
          >
            {procesoB ? "Abrir gasto" : "Ver pagos"}
          </Link>
        </div>
      </aside>
    </>
  );
}
