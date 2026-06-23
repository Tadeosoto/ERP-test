"use client";

import { useParams } from "next/navigation";
import { ObraDetailView } from "@/components/obras/obra-detail-view";

export default function ObraDetailPage() {
  const params = useParams();
  const obraId = typeof params?.obraId === "string" ? params.obraId : "";
  if (!obraId) return null;
  return <ObraDetailView obraId={obraId} />;
}
