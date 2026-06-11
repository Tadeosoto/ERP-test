"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type FeedbackVariant = "success" | "error";

type FeedbackState = {
  open: boolean;
  variant: FeedbackVariant;
  message: string;
};

type FeedbackContextValue = {
  showSuccess: (message: string, onDismiss?: () => void) => void;
  showError: (message: string, onDismiss?: () => void) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const onDismissRef = useRef<(() => void) | undefined>(undefined);
  const [state, setState] = useState<FeedbackState>({
    open: false,
    variant: "success",
    message: "",
  });

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
    const fn = onDismissRef.current;
    onDismissRef.current = undefined;
    fn?.();
  }, []);

  const show = useCallback((variant: FeedbackVariant, message: string, onDismiss?: () => void) => {
    onDismissRef.current = onDismiss;
    setState({ open: true, variant, message });
  }, []);

  const showSuccess = useCallback(
    (message: string, onDismiss?: () => void) => show("success", message, onDismiss),
    [show]
  );

  const showError = useCallback(
    (message: string, onDismiss?: () => void) => show("error", message, onDismiss),
    [show]
  );

  return (
    <FeedbackContext.Provider value={{ showSuccess, showError }}>
      {children}
      <FeedbackModal
        open={state.open}
        variant={state.variant}
        message={state.message}
        onClose={close}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback debe usarse dentro de FeedbackProvider.");
  }
  return ctx;
}
