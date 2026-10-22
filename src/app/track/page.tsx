import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeading, Spinner } from "@/components/ui";

import { TrackClient } from "./track-client";

export const metadata: Metadata = { title: "Track a request" };

export default function TrackPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="Track a request"
        intro="Enter your reference number and the email or phone number you used. Both must match."
      />
      <Suspense
        fallback={
          <p className="flex items-center gap-2 text-muted">
            <Spinner /> Loading
          </p>
        }
      >
        <TrackClient />
      </Suspense>
    </div>
  );
}
