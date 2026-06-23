import type { MouseEvent } from "react";
import Link from "next/link";
import { orderDisplayCode } from "@/lib/dashboard/compras-dashboard";
import type { PurchaseOrderDto } from "@/lib/domain/types";

type OcLinkProps = {
  order: PurchaseOrderDto;
  className?: string;
  onClick?: (e: MouseEvent) => void;
  showPdfIcon?: boolean;
};

export function OcLink({ order, className = "", onClick, showPdfIcon }: OcLinkProps) {
  const hasPdf = order.files.some((f) => f.kind === "oc_pdf");

  return (
    <Link
      href={`/ordenes/${order.id}`}
      className={`link-oc ${className}`}
      onClick={onClick}
    >
      {showPdfIcon && hasPdf && (
        <span className="mr-1 inline-block text-red-500" title="PDF adjunto">
          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4z" />
          </svg>
        </span>
      )}
      {orderDisplayCode(order)}
    </Link>
  );
}
