"use client";

import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui";

// Shown if any page crashes. Never shows the technical error to visitors.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[page error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold text-brand-900">This page did not load</h1>
      <p className="leading-relaxed text-muted">
        Something went wrong on our side. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Go to home page
        </ButtonLink>
      </div>
    </div>
  );
}
