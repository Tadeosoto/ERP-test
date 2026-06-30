"use client";

import { Suspense } from "react";
import { DireccionExpedientesView } from "@/components/expedientes/direccion-expedientes-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";

function ExpedientesPageInner() {
  const register = usePageRefreshRegister();
  return <DireccionExpedientesView onRegisterRefresh={register} />;
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando expedientes" />}>
      <ExpedientesPageInner />
    </Suspense>
  );
}
