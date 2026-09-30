"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TarjetaDetailView } from "@/components/tarjetas/tarjeta-detail-view";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessCompanyCards } from "@/lib/tarjetas/access";

function TarjetaPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const allowed = user ? canAccessCompanyCards(user) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);

  if (!user || !allowed || !params.id) return <LoadingScreen message="Cargando tarjeta" />;
  return <TarjetaDetailView cardId={params.id} />;
}

export default function TarjetaPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando tarjeta" />}>
      <TarjetaPageInner />
    </Suspense>
  );
}
