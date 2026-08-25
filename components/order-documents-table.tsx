"use client";

import { useRef } from "react";
import {
  DocumentDownloadButton,
  DocumentViewButton,
  FILE_VIEW_HINT,
} from "@/components/document-view-button";
import { FILE_KIND_LABEL } from "@/lib/domain/labels";
import type { StoredFileDto } from "@/lib/domain/types";
import { formatDateShort } from "@/lib/format";

type OrderDocumentsTableProps = {
  files: StoredFileDto[];
  canDelete?: boolean;
  canReplaceFile?: (file: StoredFileDto) => boolean;
  busy?: boolean;
  onDelete?: (fileId: string, fileName: string) => void;
  onReplace?: (fileId: string, kind: string, file: File) => void;
  emptyMessage?: string;
};

export function OrderDocumentsTable({
  files,
  canDelete = false,
  canReplaceFile,
  busy = false,
  onDelete,
  onReplace,
  emptyMessage = "Sin documentos cargados.",
}: OrderDocumentsTableProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replacingRef = useRef<{ id: string; kind: string } | null>(null);

  if (files.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">{emptyMessage}</p>;
  }

  function pickReplace(fileId: string, kind: string) {
    replacingRef.current = { id: fileId, kind };
    replaceInputRef.current?.click();
  }

  function onReplaceInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const target = replacingRef.current;
    e.target.value = "";
    replacingRef.current = null;
    if (file && target && onReplace) {
      onReplace(target.id, target.kind, file);
    }
  }

  return (
    <>
      <input
        ref={replaceInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={onReplaceInputChange}
      />
      <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th scope="col" className="px-4 py-3">
              Documento
            </th>
            <th scope="col" className="whitespace-nowrap px-4 py-3">
              Fecha de subida
            </th>
            <th scope="col" className="px-4 py-3 text-right">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {files.map((f) => (
            <tr key={f.id} className="align-top hover:bg-zinc-50/70">
              <td className="px-4 py-3">
                <p className="font-semibold text-zinc-900">{FILE_KIND_LABEL[f.kind] ?? f.kind}</p>
                <p className="mt-0.5 break-all text-xs text-zinc-500">{f.originalFileName}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-600">
                {formatDateShort(f.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <DocumentViewButton
                    fileId={f.id}
                    hint={FILE_VIEW_HINT[f.kind] ?? "abre el PDF en el navegador"}
                    variant="compact"
                  />
                  <DocumentDownloadButton fileId={f.id} variant="compact" />
                  {canReplaceFile?.(f) && onReplace && (
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-9 rounded-xl px-2 text-xs font-semibold text-violet-800 hover:bg-violet-50 hover:underline disabled:opacity-50"
                      onClick={() => pickReplace(f.id, f.kind)}
                    >
                      Reemplazar
                    </button>
                  )}
                  {canDelete && onDelete && (
                    <button
                      type="button"
                      disabled={busy}
                      className="min-h-9 rounded-xl px-2 text-xs font-semibold text-red-700 hover:bg-red-50 hover:underline disabled:opacity-50"
                      onClick={() => onDelete(f.id, f.originalFileName)}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
