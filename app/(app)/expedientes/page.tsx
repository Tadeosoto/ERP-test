"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DireccionExpedientesView } from "@/components/expedientes/direccion-expedientes-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function ExpedientesPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();

  useEffect(() => {
    if (user && user.role !== "direccion") {
      router.replace("/obras?estado=documentos");
    }
  }, [user, router]);

  if (!user) return null;
  if (user.role !== "direccion") return <LoadingScreen message="Redirigiendo" />;

  return <DireccionExpedientesView onRegisterRefresh={register} />;
}

export default function ExpedientesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando expedientes" />}>
      <ExpedientesPageInner />
    </Suspense>
  );
}
