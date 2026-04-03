"use client";

import { ConsoleErrorState } from "@/components/console-error-state";

export default function ConsoleRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ConsoleErrorState error={error} reset={reset} />;
}
