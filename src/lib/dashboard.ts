import type { DashboardFilters } from "@/lib/validation/staff";

// Pure helpers for the staff dashboard (kept separate so they can be tested).

export const PAGE_SIZE = 25;

/**
 * Builds the database "or" filter for the search box: reference, name or
 * company containing the text. The text has already been cleaned by
 * cleanSearch(), so it cannot break out of the filter.
 */
export function searchFilter(term: string): string {
  const safe = term.replace(/[%_,()*]/g, " ").trim();
  return [`reference.ilike.%${safe}%`, `full_name.ilike.%${safe}%`, `company.ilike.%${safe}%`].join(",");
}

/** Builds a dashboard link that keeps the current filters, with some changes. */
export function dashboardHref(filters: DashboardFilters, changes: Partial<Record<keyof DashboardFilters, string | number | undefined>> = {}): string {
  const merged: Record<string, string | number | undefined> = {
    type: filters.type,
    status: filters.status,
    urgency: filters.urgency,
    engineer: filters.engineer,
    q: filters.q,
    page: filters.page > 1 ? filters.page : undefined,
    ...changes,
  };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== "" && !(key === "page" && Number(value) <= 1)) {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `/staff?${query}` : "/staff";
}

export function hasActiveFilters(filters: DashboardFilters): boolean {
  return Boolean(filters.type || filters.status || filters.urgency || filters.engineer || filters.q);
}

export function pageRange(page: number, total: number): { from: number; to: number; pages: number } {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);
  return { from, to, pages };
}
