"use client";

import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { SessionProvider } from "@/components/session-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <FeedbackProvider>{children}</FeedbackProvider>
    </SessionProvider>
  );
}
