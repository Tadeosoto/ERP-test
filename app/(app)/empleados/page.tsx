"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmpleadosListView } from "@/components/empleados/empleados-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessViaticos } from "@/lib/viaticos/access";

function EmpleadosPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();
  const allowed = user ? canAccessViaticos(user.role) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);

  if (!user || !allowed) return <LoadingScreen message="Cargando empleados" />;
  return <EmpleadosListView onRegisterRefresh={register} />;
}

export default function EmpleadosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando empleados" />}>
      <EmpleadosPageInner />
    </Suspense>
  );
}
