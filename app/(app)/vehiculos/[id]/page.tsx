"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { VehicleDetailView } from "@/components/flota/vehicle-detail-view";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessFleet } from "@/lib/flota/access";

function PageInner() {
  const { user } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const allowed = user ? canAccessFleet(user) : false;
  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);
  if (!user || !allowed || !params.id) return <LoadingScreen message="Cargando vehículo" />;
  return <VehicleDetailView vehicleId={params.id} />;
}

export default function VehiculoPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando vehículo" />}>
      <PageInner />
    </Suspense>
  );
}
