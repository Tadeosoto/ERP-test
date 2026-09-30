"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VehiculosListView } from "@/components/flota/vehiculos-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessFleet } from "@/lib/flota/access";

function PageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();
  const allowed = user ? canAccessFleet(user) : false;
  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);
  if (!user || !allowed) return <LoadingScreen message="Cargando vehículos" />;
  return <VehiculosListView onRegisterRefresh={register} />;
}

export default function VehiculosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando vehículos" />}>
      <PageInner />
    </Suspense>
  );
}
