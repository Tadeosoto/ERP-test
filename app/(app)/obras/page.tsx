"use client";

import { Suspense } from "react";
import { ComprasObrasView } from "@/components/compras/compras-obras-view";
import { ObrasPageClient } from "@/components/obras-page-client";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function ObrasPageInner() {
  const register = usePageRefreshRegister();
  const { user } = useSession();

  if (user?.role === "compras") {
    return <ComprasObrasView onRegisterRefresh={register} />;
  }

  return <ObrasPageClient onRegisterRefresh={register} />;
}

export default function ObrasPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando Obras" />}>
      <ObrasPageInner />
    </Suspense>
  );
}
