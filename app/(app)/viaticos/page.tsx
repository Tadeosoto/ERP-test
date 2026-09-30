"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ViaticosListView } from "@/components/viaticos/viaticos-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessViaticos } from "@/lib/viaticos/access";

function ViaticosPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();
  const allowed = user ? canAccessViaticos(user.role) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);

  if (!user || !allowed) return <LoadingScreen message="Cargando viáticos" />;
  return <ViaticosListView onRegisterRefresh={register} />;
}

export default function ViaticosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando viáticos" />}>
      <ViaticosPageInner />
    </Suspense>
  );
}
