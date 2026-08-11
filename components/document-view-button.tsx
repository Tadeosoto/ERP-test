import { IconDownload, IconEye } from "@/components/ui/action-icons";

type Variant = "default" | "compact";

type DocumentViewButtonProps = {
  fileId: string;
  hint: string;
  variant?: Variant;
  href?: string;
};

export function DocumentViewButton({
  fileId,
  hint,
  variant = "default",
  href,
}: DocumentViewButtonProps) {
  const url = href ?? `/api/files/${fileId}`;
  if (variant === "compact") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={`Ver documento (${hint})`}
        className="btn-primary inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"
      >
        <IconEye />
        <span>Ver</span>
      </a>
    );
  }
  return (
    <a
      href={url}
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
  variant?: Variant;
  href?: string;
};

export function DocumentDownloadButton({
  fileId,
  variant = "default",
  href,
}: DocumentDownloadButtonProps) {
  const url = href ?? `/api/files/${fileId}?download=1`;
  if (variant === "compact") {
    return (
      <a
        href={url}
        title="Descargar (guarda el PDF en tu computadora)"
        className="btn-secondary inline-flex min-h-9 items-center gap-1.5 px-3 text-xs"
      >
        <IconDownload />
        <span>Descargar</span>
      </a>
    );
  }
  return (
    <a
      href={url}
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
