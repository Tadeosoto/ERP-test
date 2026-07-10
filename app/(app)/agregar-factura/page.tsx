"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AgregarFacturaView } from "@/components/direccion/agregar-factura-view";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useSession } from "@/components/session-provider";

export default function AgregarFacturaPage() {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (ready && user && user.role !== "direccion") {
      router.replace("/inicio");
    }
  }, [ready, user, router]);

  if (!ready || !user) return <LoadingScreen message="Cargando" />;
  if (user.role !== "direccion") return null;

  return <AgregarFacturaView />;
}
