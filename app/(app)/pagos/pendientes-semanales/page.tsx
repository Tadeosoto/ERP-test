"use client";

import { PendientesSemanalesView } from "@/components/pagos/pendientes-semanales-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

export default function PendientesSemanalesPage() {
  const { user } = useSession();
  const register = usePageRefreshRegister();

  if (!user) return <LoadingScreen message="Cargando" />;

  return <PendientesSemanalesView onRegisterRefresh={register} />;
}
