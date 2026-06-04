"use client";

import { ObrasPageClient } from "@/components/obras-page-client";
import { usePageRefreshRegister } from "@/components/app-shell";

export default function ObrasPage() {
  const register = usePageRefreshRegister();
  return <ObrasPageClient onRegisterRefresh={register} />;
}
