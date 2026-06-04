"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session-provider";

export function SessionGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50 text-lg text-orange-900/70">
        Cargando…
      </div>
    );
  }

  return <>{children}</>;
}
