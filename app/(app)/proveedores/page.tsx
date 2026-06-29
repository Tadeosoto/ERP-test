"use client";

import { Suspense } from "react";
import { ProveedoresListView } from "@/components/proveedores/proveedores-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";

function ProveedoresPageInner() {
  const register = usePageRefreshRegister();
  return <ProveedoresListView onRegisterRefresh={register} />;
}

export default function ProveedoresPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando proveedores" />}>
      <ProveedoresPageInner />
    </Suspense>
  );
}
