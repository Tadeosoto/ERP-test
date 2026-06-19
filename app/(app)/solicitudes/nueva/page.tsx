"use client";

import Link from "next/link";
import { useSession } from "@/components/session-provider";

export default function NuevaSolicitudPage() {
  const { user } = useSession();

  if (user && user.role !== "ingeniero") {
    return (
      <div className="card p-8">
        <p>Solo Ingeniería puede iniciar solicitudes.</p>
        <Link href="/inicio" className="mt-4 inline-block text-orange-700 underline">
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">Nueva solicitud</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Elige el tipo de expediente según el proceso de negocio.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/solicitudes/material/nueva"
          className="card group block p-6 transition hover:border-orange-300 hover:shadow-md"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-orange-600">Proceso A</p>
          <h2 className="mt-2 text-lg font-bold text-zinc-900">Solicitud de material</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Compra con OC. Ingeniería solicita materiales; Compras cotiza, crea la OC y envía el PDF para tu
            aprobación.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-orange-700 group-hover:underline">
            Crear solicitud A →
          </span>
        </Link>

        <Link
          href="/solicitudes/gasto/nueva"
          className="card group block p-6 transition hover:border-teal-300 hover:shadow-md"
        >
          <p className="text-xs font-bold uppercase tracking-wide text-teal-600">Proceso B</p>
          <h2 className="mt-2 text-lg font-bold text-zinc-900">Gasto directo</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sin OC ni Compras. Administración registra el pago y la factura; Recepción y Contabilidad cierran el
            expediente.
          </p>
          <span className="mt-4 inline-block text-sm font-semibold text-teal-700 group-hover:underline">
            Crear solicitud B →
          </span>
        </Link>
      </div>
    </div>
  );
}
