"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "../components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-8">
      <div className="bg-card border border-border rounded-card p-6 max-w-md w-full flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground break-words">
          {error?.message || "An unexpected error occurred."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/app" className="text-primary hover:underline min-h-[44px] inline-flex items-center">
            Open app
          </Link>
        </div>
      </div>
    </div>
  );
}
