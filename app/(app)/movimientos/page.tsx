"use client";

import { MovimientosPageClient } from "@/components/movimientos-page-client";
import { usePageRefreshRegister } from "@/components/app-shell";

export default function MovimientosPage() {
  const register = usePageRefreshRegister();
  return <MovimientosPageClient variant="recent" onRegisterRefresh={register} />;
}
