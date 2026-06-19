"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session-provider";
import { LoadingScreen } from "@/components/ui/loading-screen";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <LoadingScreen
        message="Cargando Sesión"
        viewport
        className="bg-white"
      />
    );
  }

  return <>{children}</>;
}
