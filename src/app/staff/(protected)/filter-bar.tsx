"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { SelectInput, TextInput } from "@/components/fields";
import { Button, Spinner } from "@/components/ui";
import { REQUEST_TYPES, STATUSES, URGENCIES } from "@/lib/constants";
import type { DashboardFilters } from "@/lib/validation/staff";

// A normal GET form, so filters work even before JavaScript loads and the
// page address can be bookmarked or shared. With JavaScript, dropdowns apply
// as soon as they change.
export function FilterBar({
  filters,
  engineers,
}: {
  filters: DashboardFilters;
  engineers: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form).entries()) {
      if (typeof value === "string" && value.trim() !== "") params.set(key, value.trim());
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `/staff?${query}` : "/staff"));
  };

  return (
    <form
      method="get"
      action="/staff"
      role="search"
      aria-label="Filter requests"
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
      className="rounded-lg border border-line bg-white p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <label htmlFor="f-q" className="block text-sm font-semibold">
            Search
          </label>
          <TextInput
            id="f-q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder="Name, company or ref"
            className="mt-1"
            maxLength={60}
          />
        </div>
        {(
          [
            ["f-type", "type", "Type", REQUEST_TYPES, filters.type, "All types"],
            [
              "f-status",
              "status",
              "Status",
              [{ value: "open", label: "Open (not done)" }, ...STATUSES],
              filters.status,
              "All statuses",
            ],
            ["f-urgency", "urgency", "Urgency", URGENCIES, filters.urgency, "All urgencies"],
            [
              "f-engineer",
              "engineer",
              "Engineer",
              [{ value: "unassigned", label: "Unassigned" }, ...engineers.map((e) => ({ value: e.id, label: e.full_name }))],
              filters.engineer,
              "All engineers",
            ],
          ] as const
        ).map(([id, name, label, options, value, placeholder]) => (
          <div key={id}>
            <label htmlFor={id} className="block text-sm font-semibold">
              {label}
            </label>
            <SelectInput
              id={id}
              name={name}
              defaultValue={value ?? ""}
              options={options}
              placeholder={placeholder}
              className="mt-1"
              onChange={(e) => e.currentTarget.form && apply(e.currentTarget.form)}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary" className="min-h-10 py-1.5">
          Search
        </Button>
        <Link href="/staff" className="text-sm font-medium text-brand-700 hover:underline">
          Clear filters
        </Link>
        {pending && (
          <span className="flex items-center gap-2 text-sm text-muted" role="status">
            <Spinner /> Updating list
          </span>
        )}
      </div>
    </form>
  );
}
