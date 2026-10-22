"use client";

import { useEffect } from "react";

import { Alert, Button, ButtonLink } from "@/components/ui";

export default function StaffError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[staff page error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="max-w-xl space-y-4">
      <Alert tone="error" title="This page did not load">
        Something went wrong while loading staff data. Try again. If it keeps happening, check that Supabase is running
        and you are still logged in.
      </Alert>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/staff" variant="secondary">
          All requests
        </ButtonLink>
      </div>
    </div>
  );
}
