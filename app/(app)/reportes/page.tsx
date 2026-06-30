"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DireccionReportesView } from "@/components/reportes/direccion-reportes-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

function ReportesPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();

  useEffect(() => {
    if (user && user.role !== "direccion") {
      router.replace("/inicio");
    }
  }, [user, router]);

  if (!user || user.role !== "direccion") {
    return <LoadingScreen message="Cargando reportes" />;
  }

  return <DireccionReportesView onRegisterRefresh={register} />;
}

export default function ReportesPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando reportes" />}>
      <ReportesPageInner />
    </Suspense>
  );
}
