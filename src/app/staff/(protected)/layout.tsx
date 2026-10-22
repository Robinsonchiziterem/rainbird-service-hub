import Link from "next/link";
import { redirect } from "next/navigation";

import { getStaffSession } from "@/lib/staff-auth";

import { SignOutButton } from "../sign-out-button";

export const dynamic = "force-dynamic";

// Every page inside (protected) passes through here first.
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();

  if (session.kind === "not-logged-in") redirect("/staff/login");

  if (session.kind === "not-staff") {
    return (
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl font-bold text-brand-900">No staff access</h1>
        <p className="leading-relaxed text-muted">
          You are logged in as {session.email}, but this account is not on the staff list. Ask an administrator to add
          you, then log in again.
        </p>
        <SignOutButton variant="secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <nav aria-label="Staff">
          <Link href="/staff" className="font-semibold text-brand-700 hover:underline">
            All requests
          </Link>
        </nav>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>
            Logged in as <strong className="text-ink">{session.name}</strong>
          </span>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
