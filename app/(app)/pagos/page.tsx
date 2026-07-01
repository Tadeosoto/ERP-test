"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DireccionPagosView } from "@/components/pagos/direccion-pagos-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function PagosPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();

  useEffect(() => {
    if (user?.role === "recepcion") {
      router.replace("/inicio");
    }
  }, [user, router]);

  if (!user || user.role === "recepcion") {
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
