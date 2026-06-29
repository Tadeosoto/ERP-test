"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DireccionPagosView } from "@/components/pagos/direccion-pagos-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function PagosPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();

  useEffect(() => {
    if (user && user.role !== "direccion") {
      router.replace("/obras?estado=pago");
    }
  }, [user, router]);

  if (!user) return null;
  if (user.role !== "direccion") {
    return <LoadingScreen message="Redirigiendo" />;
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
