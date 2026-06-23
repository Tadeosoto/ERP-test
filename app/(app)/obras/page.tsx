"use client";

import { Suspense } from "react";
import { ObrasListView } from "@/components/obras/obras-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";

function ObrasPageInner() {
  const register = usePageRefreshRegister();
  return <ObrasListView onRegisterRefresh={register} />;
}

export default function ObrasPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando Obras" />}>
      <ObrasPageInner />
    </Suspense>
  );
}
