"use client";

import { ConfirmDeleteProvider } from "@/components/ui/confirm-delete-provider";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { SessionProvider } from "@/components/session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FeedbackProvider>
        <ConfirmDeleteProvider>{children}</ConfirmDeleteProvider>
      </FeedbackProvider>
    </SessionProvider>
  );
}
