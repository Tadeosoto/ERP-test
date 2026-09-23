"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CompromisosRecurrentesView } from "@/components/pagos/compromisos-recurrentes-view";
import { usePageRefreshRegister } from "@/components/app-shell";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canViewRecurringCommitments } from "@/lib/domain/transitions";

function CompromisosPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const register = usePageRefreshRegister();
  const allowed = Boolean(user && canViewRecurringCommitments(user.role));

  useEffect(() => {
    if (user && !canViewRecurringCommitments(user.role)) {
      router.replace("/inicio");
    }
  }, [user, router]);

  if (!user || !allowed) {
    return <LoadingScreen message="Cargando compromisos" />;
  }

  return <CompromisosRecurrentesView onRegisterRefresh={register} />;
}

export default function CompromisosPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando compromisos" />}>
      <CompromisosPageInner />
    </Suspense>
  );
}
