import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge, TypeBadge, UrgencyBadge } from "@/components/badges";
import { Alert } from "@/components/ui";
import { PAGE_SIZE, dashboardHref, hasActiveFilters, pageRange, searchFilter } from "@/lib/dashboard";
import type { DashboardStats, RequestStatus, RequestType, RequestUrgency } from "@/lib/database.types";
import { formatAge, formatDateTime } from "@/lib/format";
import { getServerSupabase } from "@/lib/supabase/server";
import { parseDashboardFilters } from "@/lib/validation/staff";

import { FilterBar } from "./filter-bar";

export const metadata: Metadata = { title: "Staff dashboard" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  reference: string;
  type: RequestType;
  status: RequestStatus;
  urgency: RequestUrgency;
  full_name: string;
  company: string | null;
  state: string | null;
  town: string | null;
  created_at: string;
  engineer: { full_name: string } | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseDashboardFilters(await searchParams);
  const supabase = await getServerSupabase();

  // Build the list query from the filters.
  let query = supabase
    .from("requests")
    .select("id, reference, type, status, urgency, full_name, company, state, town, created_at, engineer:engineers(full_name)", {
      count: "exact",
    });
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.status === "open") query = query.eq("is_open", true);
  else if (filters.status) query = query.eq("status", filters.status);
  if (filters.urgency) query = query.eq("urgency", filters.urgency);
  if (filters.engineer === "unassigned") query = query.is("assigned_engineer_id", null);
  else if (filters.engineer) query = query.eq("assigned_engineer_id", filters.engineer);
  if (filters.q) query = query.or(searchFilter(filters.q));

  // Priority order: open first, then critical > high > normal > low, then oldest first.
  const from = (filters.page - 1) * PAGE_SIZE;
  query = query
    .order("is_open", { ascending: false })
    .order("urgency", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, from + PAGE_SIZE - 1);

  const [listResult, statsResult, engineersResult] = await Promise.all([
    query,
    supabase.rpc("staff_dashboard_stats"),
    supabase.from("engineers").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const rows = (listResult.data ?? []) as Row[];
  const total = listResult.count ?? 0;
  const stats = (statsResult.data ?? null) as DashboardStats | null;
  const engineers = engineersResult.data ?? [];
  const { from: shownFrom, to: shownTo, pages } = pageRange(filters.page, total);
  const now = new Date();

  if (listResult.error) console.error("[dashboard] list failed", listResult.error);
  if (statsResult.error) console.error("[dashboard] stats failed", statsResult.error);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-brand-900">Requests</h1>

      <section aria-label="Summary" className="grid grid-cols-3 gap-3">
        <Counter label="Open requests" value={stats?.open} href={dashboardHref({ ...filters, page: 1 }, { status: "open", urgency: undefined, page: undefined })} />
        <Counter
          label="Critical, still open"
          value={stats?.critical_open}
          tone={stats && stats.critical_open > 0 ? "alert" : "plain"}
          href={dashboardHref({ ...filters, page: 1 }, { status: "open", urgency: "critical", page: undefined })}
        />
        <Counter label="Completed this week" value={stats?.completed_this_week} href={dashboardHref({ ...filters, page: 1 }, { status: "done", urgency: undefined, page: undefined })} />
      </section>

      <FilterBar key={JSON.stringify(filters)} filters={filters} engineers={engineers} />

      {listResult.error ? (
        <Alert tone="error" live="assertive" title="The request list did not load">
          Refresh the page to try again. If it keeps failing, check that Supabase is running.
        </Alert>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          {hasActiveFilters(filters) ? (
            <>
              <p className="font-semibold">No requests match these filters.</p>
              <Link href="/staff" className="mt-2 inline-block font-medium text-brand-700 hover:underline">
                Clear filters
              </Link>
            </>
          ) : (
            <>
              <p className="font-semibold">No requests yet.</p>
              <p className="mt-1 text-muted">
                New quote and service requests appear here the moment a customer sends one.
              </p>
            </>
          )}
        </div>
      ) : (
        <section aria-labelledby="list-heading">
          <h2 id="list-heading" className="sr-only">
            Request list
          </h2>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            Showing {shownFrom} to {shownTo} of {total}. Open requests first, most urgent at the top, then oldest first.
          </p>

          {/* Phones: one card per request */}
          <ul className="space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/staff/requests/${r.id}`}
                  className={`block rounded-lg border bg-white p-4 hover:border-brand-500 ${
                    r.urgency === "critical" && r.status !== "done" ? "border-l-4 border-l-red-700 border-line" : "border-line"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular font-bold text-brand-800">{r.reference}</span>
                    <span className="text-xs text-muted">{formatAge(r.created_at, now)}</span>
                  </div>
                  <p className="mt-1 font-medium">
                    {r.full_name}
                    {r.company && <span className="font-normal text-muted">, {r.company}</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <TypeBadge type={r.type} />
                    <UrgencyBadge urgency={r.urgency} />
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 text-sm text-muted">{r.engineer?.full_name ?? "Unassigned"}</p>
                </Link>
              </li>
            ))}
          </ul>

          {/* Wider screens: a table */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-surface text-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Reference</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Urgency</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Engineer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-brand-50/50 ${r.urgency === "critical" && r.status !== "done" ? "shadow-[inset_4px_0_0_#b91c1c]" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/staff/requests/${r.id}`} className="tabular font-bold text-brand-700 hover:underline">
                        {r.reference}
                      </Link>
                      <div className="mt-1">
                        <TypeBadge type={r.type} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{r.full_name}</span>
                      {r.company && <span className="block text-muted">{r.company}</span>}
                      {(r.town || r.state) && (
                        <span className="block text-xs text-muted">{[r.town, r.state].filter(Boolean).join(", ")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <UrgencyBadge urgency={r.urgency} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">{r.engineer?.full_name ?? <span className="text-muted">Unassigned</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap" title={formatDateTime(r.created_at)}>
                      {formatAge(r.created_at, now)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3 text-sm">
              {filters.page > 1 ? (
                <Link href={dashboardHref(filters, { page: filters.page - 1 })} className="font-semibold text-brand-700 hover:underline">
                  Previous page
                </Link>
              ) : (
                <span />
              )}
              <span className="text-muted">
                Page {filters.page} of {pages}
              </span>
              {filters.page < pages ? (
                <Link href={dashboardHref(filters, { page: filters.page + 1 })} className="font-semibold text-brand-700 hover:underline">
                  Next page
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>
      )}
    </div>
  );
}

function Counter({
  label,
  value,
  href,
  tone = "plain",
}: {
  label: string;
  value: number | undefined;
  href: string;
  tone?: "plain" | "alert";
}) {
  return (
    <Link
      href={href}
      className={`block rounded-lg border p-3 hover:border-brand-500 sm:p-4 ${
        tone === "alert" ? "border-red-300 bg-red-50 text-red-900" : "border-line bg-white"
      }`}
    >
      <span className="tabular block text-2xl font-bold sm:text-3xl">{value ?? "–"}</span>
      <span className="block text-xs font-medium leading-snug sm:text-sm">{label}</span>
    </Link>
  );
}
