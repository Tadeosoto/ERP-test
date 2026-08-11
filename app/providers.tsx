"use client";

import { ConfirmDeleteProvider } from "@/components/ui/confirm-delete-provider";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { SessionProvider } from "@/components/session-provider";
import { RecurringDueAckModal } from "@/components/pagos/recurring-due-ack-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FeedbackProvider>
        <ConfirmDeleteProvider>
          {children}
          <RecurringDueAckModal />
        </ConfirmDeleteProvider>
      </FeedbackProvider>
    </SessionProvider>
  );
}
