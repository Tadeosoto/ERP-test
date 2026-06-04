import { IconDownload, IconEye } from "@/components/ui/action-icons";

type DocumentViewButtonProps = {
  fileId: string;
  hint: string;
};

export function DocumentViewButton({ fileId, hint }: DocumentViewButtonProps) {
  return (
    <a
      href={`/api/files/${fileId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary max-w-full"
    >
      <IconEye />
      <span>Ver documento</span>
      <span className="font-normal text-orange-100">({hint})</span>
    </a>
  );
}

type DocumentDownloadButtonProps = {
  fileId: string;
};

export function DocumentDownloadButton({ fileId }: DocumentDownloadButtonProps) {
  return (
    <a
      href={`/api/files/${fileId}?download=1`}
      className="btn-secondary max-w-full"
    >
      <IconDownload />
      <span>Descargar</span>
      <span className="font-normal text-teal-700">(guarda el PDF en tu computadora)</span>
    </a>
  );
}

export const FILE_VIEW_HINT: Record<string, string> = {
  oc_pdf: "abre la orden de compra en el navegador",
  factura: "abre la factura en el navegador",
  complemento_pago: "abre el complemento de pago en el navegador",
};
