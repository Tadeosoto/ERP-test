"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ViaticoDetailView } from "@/components/viaticos/viatico-detail-view";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";
import { canAccessViaticos } from "@/lib/viaticos/access";

function ViaticoDetailPageInner() {
  const { user } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const allowed = user ? canAccessViaticos(user.role) : false;

  useEffect(() => {
    if (user && !allowed) router.replace("/inicio");
  }, [allowed, router, user]);

  if (!user || !allowed || !params.id) return <LoadingScreen message="Cargando viático" />;
  return <ViaticoDetailView viaticoId={params.id} />;
}

export default function ViaticoDetailPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Cargando viático" />}>
      <ViaticoDetailPageInner />
    </Suspense>
  );
}
