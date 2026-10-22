import type { Metadata } from "next";

import { Alert, PageHeading } from "@/components/ui";

import { ServiceForm } from "./service-form";

export const metadata: Metadata = { title: "Request service" };

export default function ServicePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeading
        title="Request service"
        intro="Report a fault, book maintenance, order spare parts or ask for technical advice."
      />
      <Alert tone="warning" title="Is someone in danger?">
        If there is a fire, flooding or an electrical hazard, make the area safe and call emergency services on 112
        first. Then send this form marked Critical.
      </Alert>
      <ServiceForm />
    </div>
  );
}
