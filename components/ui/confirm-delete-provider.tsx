"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal";
import { useSession } from "@/components/session-provider";

export type ConfirmDeleteOptions = {
  title?: string;
  message: string;
  /** Nombre de lo que se elimina (obra, OC, factura, etc.). Se usa en el segundo aviso. */
  itemName: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type Step = "first" | "final";

type ConfirmDeleteState = {
  open: boolean;
  busy: boolean;
  step: Step;
  title: string;
  message: string;
  itemName: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmDeleteContextValue = {
  confirmDelete: (options: ConfirmDeleteOptions) => Promise<boolean>;
};

const ConfirmDeleteContext = createContext<ConfirmDeleteContextValue | null>(null);

const DEFAULT_TITLE = "¿Confirmar eliminación?";
const FINAL_UNLOCK_MS = 2000;

function buildFinalMessage(actorName: string, itemName: string): string {
  const who = actorName.trim() || "Usuario";
  return `${who}, ¿estás completamente seguro/a?\n\nEstás eliminando «${itemName}» para siempre.`;
}

export function ConfirmDeleteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const [state, setState] = useState<ConfirmDeleteState>({
    open: false,
    busy: false,
    step: "first",
    title: DEFAULT_TITLE,
    message: "",
    itemName: "",
  });

  const finish = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false, busy: false, step: "first" }));
  }, []);

  const confirmDelete = useCallback((options: ConfirmDeleteOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        busy: false,
        step: "first",
        title: options.title ?? DEFAULT_TITLE,
        message: options.message,
        itemName: options.itemName.trim() || "este elemento",
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (state.step === "first") {
      const actorName = user?.name?.trim() || user?.email || "Usuario";
      setState((s) => ({
        ...s,
        step: "final",
        title: "Última confirmación",
        message: buildFinalMessage(actorName, s.itemName),
        confirmLabel: "Sí, eliminar para siempre",
      }));
      return;
    }
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState((s) => ({ ...s, open: false, busy: false, step: "first" }));
  }, [state.step, user?.email, user?.name]);

  const handleCancel = useCallback(() => {
    if (state.busy) return;
    finish(false);
  }, [finish, state.busy]);

  const isFinal = state.step === "final";

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
        finalStep={isFinal}
        confirmUnlockMs={isFinal ? FINAL_UNLOCK_MS : 0}
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
