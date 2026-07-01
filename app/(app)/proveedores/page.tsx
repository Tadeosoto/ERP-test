"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProveedoresListView } from "@/components/proveedores/proveedores-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function ProveedoresPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();

  useEffect(() => {
    if (user?.role === "recepcion") {
      router.replace("/inicio");
    }
  }, [user, router]);

  if (!user || user.role === "recepcion") {
    return <LoadingScreen message="Cargando proveedores" />;
  }

  return <ProveedoresListView onRegisterRefresh={register} />;
}

export default function ProveedoresPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando proveedores" />}>
      <ProveedoresPageInner />
    </Suspense>
  );
}
