"use client";

import { Suspense } from "react";
import { OrdenesListView } from "@/components/ordenes/ordenes-list-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";

function OrdenesPageInner() {
  const register = usePageRefreshRegister();
  return <OrdenesListView onRegisterRefresh={register} />;
}

export default function OrdenesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando órdenes de compra" />}>
      <OrdenesPageInner />
    </Suspense>
  );
}
