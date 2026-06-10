"use client";

import { Suspense } from "react";
import { ObrasPageClient } from "@/components/obras-page-client";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";

function ObrasPageInner() {
  const register = usePageRefreshRegister();
  return <ObrasPageClient onRegisterRefresh={register} />;
}

export default function ObrasPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando Obras" />}>
      <ObrasPageInner />
    </Suspense>
  );
}
