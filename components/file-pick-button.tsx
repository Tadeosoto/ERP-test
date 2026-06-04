"use client";

import { useId, useState } from "react";
import { IconUpload } from "@/components/ui/action-icons";

type FilePickButtonProps = {
  accept?: string;
  disabled?: boolean;
  onPick: (file: File) => void;
  /** Texto principal del botón */
  label: string;
  /** Texto entre paréntesis que indica qué hacer */
  hint: string;
};

export function FilePickButton({
  accept = "application/pdf,.pdf",
  disabled,
  onPick,
  label,
  hint,
}: FilePickButtonProps) {
  const inputId = useId();
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className={`btn-secondary max-w-full cursor-pointer ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <IconUpload />
        <span>{label}</span>
        <span className="font-normal text-teal-700">({hint})</span>
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setSelectedName(file.name);
          onPick(file);
        }}
      />
      {selectedName && (
        <p className="text-base text-zinc-600">
          Archivo seleccionado: <span className="font-medium text-zinc-800">{selectedName}</span>
        </p>
      )}
    </div>
  );
}
