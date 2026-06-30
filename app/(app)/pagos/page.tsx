"use client";

import { Suspense } from "react";
import { DireccionPagosView } from "@/components/pagos/direccion-pagos-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";

function PagosPageInner() {
  const register = usePageRefreshRegister();
  return <DireccionPagosView onRegisterRefresh={register} />;
}

export default function PagosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando pagos" />}>
      <PagosPageInner />
    </Suspense>
  );
}
