"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert, Button, ButtonLink, DetailList } from "@/components/ui";
import { normalizeReference, typeFromReference } from "@/lib/reference";
import { type ConfirmationData, readConfirmation } from "@/lib/session-store";

export function ConfirmationClient() {
  const searchParams = useSearchParams();
  const reference = normalizeReference(searchParams.get("ref"));
  const [data, setData] = useState<ConfirmationData | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setData(reference ? readConfirmation(reference) : null);
    headingRef.current?.focus();
  }, [reference]);

  if (!reference) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold text-brand-900">No request to show</h1>
        <p className="text-muted">This page shows your reference number after you send a request.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/quote">Request a quote</ButtonLink>
          <ButtonLink href="/service" variant="secondary">
            Request service
          </ButtonLink>
        </div>
      </div>
    );
  }

  const kind = data?.kind ?? typeFromReference(reference);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const photoProblem =
    data?.photosChosen && (data.photosSaved ?? 0) < data.photosChosen
      ? data.photosChosen - (data.photosSaved ?? 0)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="rounded-lg border-t-8 border-teal-600 bg-white p-6 sm:p-10">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-brand-900 outline-none sm:text-3xl">
          {kind === "service" ? "Service request sent" : "Quote request sent"}
        </h1>
        <p className="mt-2 text-muted">Keep this reference number. You need it to track your request.</p>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <p className="rounded-md bg-brand-50 px-5 py-3 text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
            <span className="sr-only">Your reference number is </span>
            {reference}
          </p>
          <Button type="button" variant="secondary" onClick={copy}>
            {copied ? "Copied" : "Copy reference"}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Reference copied" : ""}
          </span>
        </div>

        <p className="mt-6 leading-relaxed">
          We have logged it and our team can see it now.{" "}
          {kind === "service"
            ? "Critical and high urgency faults are handled first. An engineer will contact you using the details you gave."
            : "An engineer will review your site details and contact you with a quote."}
        </p>
      </div>

      {photoProblem > 0 && (
        <Alert tone="warning" title="Some photos did not upload">
          Your request was saved, but {photoProblem === 1 ? "1 photo" : `${photoProblem} photos`} could not be
          uploaded. You can share them with the engineer when they contact you.
        </Alert>
      )}

      {data && data.summary.length > 0 && (
        <section aria-labelledby="summary-heading" className="rounded-lg border border-line bg-white p-6 sm:p-8">
          <h2 id="summary-heading" className="text-lg font-bold text-brand-900">
            What you sent
          </h2>
          <div className="mt-3">
            <DetailList
              items={[
                ...data.summary,
                ...(data.photosChosen ? ([["Photos", `${data.photosSaved ?? 0} uploaded`]] as [string, string][]) : []),
              ]}
            />
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <ButtonLink href={`/track?ref=${encodeURIComponent(reference)}`}>Track this request</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
