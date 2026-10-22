import type { Metadata } from "next";

import { PageHeading } from "@/components/ui";

import { QuoteForm } from "./quote-form";

export const metadata: Metadata = { title: "Request a quote" };

export default function QuotePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeading
        title="Request a quote"
        intro="Tell us about your site and what you need. It takes about three minutes, and an engineer will follow up with a proper quote."
      />
      <QuoteForm />
    </div>
  );
}
