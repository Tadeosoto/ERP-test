import Link from "next/link";

export default function ProveedoresPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      </span>
      <h1 className="mt-6 text-2xl font-bold text-zinc-900">Proveedores</h1>
      <p className="mt-3 text-base leading-relaxed text-zinc-600">
        Sitio en construcción. Esta sección estará disponible cuando se confirme el alcance del
        módulo.
      </p>
      <Link href="/inicio" className="btn-secondary mt-8">
        Volver al inicio
      </Link>
    </div>
  );
}
