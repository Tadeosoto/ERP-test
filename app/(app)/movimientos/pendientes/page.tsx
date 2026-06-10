"use client";

import { MovimientosPageClient } from "@/components/movimientos-page-client";
import { usePageRefreshRegister } from "@/components/app-shell";

export default function MovimientosPendientesPage() {
  const register = usePageRefreshRegister();
  return <MovimientosPageClient variant="pending" onRegisterRefresh={register} />;
}
