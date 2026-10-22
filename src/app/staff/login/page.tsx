import type { Metadata } from "next";
import { Suspense } from "react";

import { Spinner } from "@/components/ui";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff login" };

export default function StaffLoginPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-bold tracking-tight text-brand-900">Staff login</h1>
      <p className="mt-2 text-muted">For Rain Bird Service Hub staff only. Customers do not need an account.</p>
      <div className="mt-6 rounded-lg border border-line bg-white p-6">
        <Suspense
          fallback={
            <p className="flex items-center gap-2 text-muted">
              <Spinner /> Loading
            </p>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
