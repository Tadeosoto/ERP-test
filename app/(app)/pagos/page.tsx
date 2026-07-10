"use client";

import { Suspense } from "react";
import { DireccionPagosView } from "@/components/pagos/direccion-pagos-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function PagosPageInner() {
  const { user } = useSession();
  const register = usePageRefreshRegister();

  if (!user) {
    return <LoadingScreen message="Cargando pagos" />;
  }

  return <DireccionPagosView onRegisterRefresh={register} />;
}

export default function PagosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando pagos" />}>
      <PagosPageInner />
    </Suspense>
  );
}
