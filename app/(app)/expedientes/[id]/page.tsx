import { redirect } from "next/navigation";

/** Módulo Expedientes retirado: los documentos viven en cada OC. */
export default function ExpedienteDetailPage() {
  redirect("/ordenes");
}
