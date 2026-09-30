"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CombustibleView } from "@/components/flota/combustible-view";
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
  if (!user || !allowed) return <LoadingScreen message="Cargando combustible" />;
  return <CombustibleView onRegisterRefresh={register} />;
}

export default function CombustiblePage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando combustible" />}>
      <PageInner />
    </Suspense>
  );
}
