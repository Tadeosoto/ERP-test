"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MovimientoDetailView } from "@/components/tarjetas/movimiento-detail-view";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessCompanyCards } from "@/lib/tarjetas/access";

function MovimientoPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const allowed = user ? canAccessCompanyCards(user) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);

  if (!user || !allowed || !params.id) return <LoadingScreen message="Cargando movimiento" />;
  return <MovimientoDetailView movementId={params.id} />;
}

export default function MovimientoPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando movimiento" />}>
      <MovimientoPageInner />
    </Suspense>
  );
}
