"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";

export type ConfirmDeleteOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmDeleteState = ConfirmDeleteOptions & {
  open: boolean;
  busy: boolean;
  title: string;
};

type ConfirmDeleteContextValue = {
  confirmDelete: (options: ConfirmDeleteOptions) => Promise<boolean>;
};

const ConfirmDeleteContext = createContext<ConfirmDeleteContextValue | null>(null);

const DEFAULT_TITLE = "¿Confirmar eliminación?";

export function ConfirmDeleteProvider({ children }: { children: React.ReactNode }) {
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [state, setState] = useState<ConfirmDeleteState>({
    open: false,
    busy: false,
    title: DEFAULT_TITLE,
    message: "",
  });

  const finish = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false, busy: false }));
  }, []);

  const confirmDelete = useCallback((options: ConfirmDeleteOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        busy: false,
        title: options.title ?? DEFAULT_TITLE,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false, busy: false }));
  }, []);

  const handleCancel = useCallback(() => {
    if (state.busy) return;
    finish(false);
  }, [finish, state.busy]);

  return (
    <ConfirmDeleteContext.Provider value={{ confirmDelete }}>
      {children}
      <ConfirmDeleteModal
        open={state.open}
        title={state.title}
        message={state.message}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        busy={state.busy}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmDeleteContext.Provider>
  );
}

export function useConfirmDelete() {
  const ctx = useContext(ConfirmDeleteContext);
  if (!ctx) {
    throw new Error("useConfirmDelete debe usarse dentro de ConfirmDeleteProvider.");
  }
  return ctx;
}
