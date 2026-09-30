"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TarjetasListView } from "@/components/tarjetas/tarjetas-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessCompanyCards } from "@/lib/tarjetas/access";

function TarjetasPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();
  const allowed = user ? canAccessCompanyCards(user) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);

  if (!user || !allowed) return <LoadingScreen message="Cargando tarjetas" />;
  return <TarjetasListView onRegisterRefresh={register} />;
}

export default function TarjetasPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando tarjetas" />}>
      <TarjetasPageInner />
    </Suspense>
  );
}
