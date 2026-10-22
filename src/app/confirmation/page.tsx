import type { Metadata } from "next";
import { Suspense } from "react";

import { Spinner } from "@/components/ui";

import { ConfirmationClient } from "./confirmation-client";

export const metadata: Metadata = { title: "Request sent" };

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center gap-2 text-muted">
          <Spinner /> Loading
        </p>
      }
    >
      <ConfirmationClient />
    </Suspense>
  );
}
