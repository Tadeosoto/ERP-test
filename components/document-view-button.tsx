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
      className="btn-primary w-full max-w-none flex-wrap justify-center gap-x-2 gap-y-0.5 px-4 text-center text-sm sm:text-base"
    >
      <IconEye />
      <span>Ver documento</span>
      <span className="w-full basis-full font-normal text-orange-100 sm:w-auto sm:basis-auto">
        ({hint})
      </span>
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
      className="btn-secondary w-full max-w-none flex-wrap justify-center gap-x-2 gap-y-0.5 px-4 text-center text-sm sm:text-base"
    >
      <IconDownload />
      <span>Descargar</span>
      <span className="w-full basis-full font-normal text-teal-700 sm:w-auto sm:basis-auto">
        (guarda el PDF en tu computadora)
      </span>
    </a>
  );
}

export const FILE_VIEW_HINT: Record<string, string> = {
  oc_pdf: "abre la orden de compra en el navegador",
  comprobante_pago: "abre el comprobante de pago en el navegador",
  factura: "abre la factura en el navegador",
  complemento_pago: "abre el complemento de pago en el navegador",
};
