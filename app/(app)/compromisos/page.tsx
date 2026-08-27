"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CompromisosRecurrentesView } from "@/components/pagos/compromisos-recurrentes-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function CompromisosPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();

  useEffect(() => {
    if (user && user.role !== "pagos" && user.role !== "direccion") {
      router.replace("/inicio");
    }
  }, [user, router]);

  if (!user || (user.role !== "pagos" && user.role !== "direccion")) {
    return <LoadingScreen message="Cargando compromisos" />;
  }

  return <CompromisosRecurrentesView onRegisterRefresh={register} />;
}

export default function CompromisosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando compromisos" />}>
      <CompromisosPageInner />
    </Suspense>
  );
}
