"use client";

import { useParams } from "next/navigation";
import { CaseDetailClient } from "@/components/case-detail-client";

export default function CaseDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  if (!id) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <p className="text-zinc-600">Expediente no válido.</p>
      </div>
    );
  }

  return <CaseDetailClient caseId={id} />;
}
