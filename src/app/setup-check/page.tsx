import type { Metadata } from "next";

import { runSetupChecks, type SetupCheck } from "@/lib/setup-check";

export const metadata: Metadata = { title: "Setup check" };
export const dynamic = "force-dynamic";

// A plain checklist page that tells you whether Supabase is set up correctly.
// Open http://localhost:3000/setup-check after finishing the Phase 1 guide.
export default async function SetupCheckPage() {
  let checks: SetupCheck[] = [];
  let failedToRun = false;

  try {
    checks = await runSetupChecks();
  } catch {
    failedToRun = true;
  }

  const allOk = !failedToRun && checks.length > 0 && checks.every((c) => c.ok);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-800 sm:text-3xl">Setup check</h1>
      <p className="mt-2 text-muted">
        This page confirms that the database, security rules, photo storage and demo staff account are ready.
      </p>

      <div
        role="status"
        className={`mt-6 rounded-lg border p-4 font-medium ${
          allOk ? "border-teal-500 bg-teal-50 text-teal-700" : "border-amber-400 bg-amber-50 text-amber-900"
        }`}
      >
        {failedToRun
          ? "The check could not run. Make sure your Supabase project is running and your .env.local values are correct."
          : allOk
            ? "Everything is set up. The app is ready to use."
            : "Some steps still need attention. Follow the fix under each item below."}
      </div>

      {checks.length > 0 && (
        <ul className="mt-6 space-y-3">
          {checks.map((check) => (
            <li key={check.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    check.ok ? "bg-teal-600" : "bg-red-700"
                  }`}
                >
                  {check.ok ? "✓" : "!"}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">
                    {check.label}
                    <span className="sr-only">{check.ok ? ": passed" : ": needs attention"}</span>
                  </p>
                  <p className="mt-1 break-words text-sm text-muted">{check.detail}</p>
                  {check.fix && (
                    <p className="mt-2 break-words text-sm text-ink">
                      <span className="font-semibold">Fix: </span>
                      {check.fix}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
