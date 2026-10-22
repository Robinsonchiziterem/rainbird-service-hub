import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StatusBadge, TypeBadge, UrgencyBadge } from "@/components/badges";
import { Alert, DetailList } from "@/components/ui";
import {
  ISSUE_TYPES,
  PHOTO_RULES,
  PRODUCT_AREAS,
  SITE_TYPES,
  STATUSES,
  TIMELINES,
  WATER_NEEDS,
  WATER_SOURCES,
  labelFor,
} from "@/lib/constants";
import type { RequestRow } from "@/lib/database.types";
import { formatBytes, formatDateTime } from "@/lib/format";
import { formatNgPhone } from "@/lib/phone";
import { getServerSupabase } from "@/lib/supabase/server";

import { UpdatePanel } from "./update-panel";

export const metadata: Metadata = { title: "Request details" };
export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await getServerSupabase();

  const [requestRes, photosRes, historyRes, notesRes, notificationsRes, engineersRes, staffRes] = await Promise.all([
    supabase.from("requests").select("*, engineer:engineers(full_name, phone)").eq("id", id).maybeSingle(),
    supabase.from("request_photos").select("*").eq("request_id", id).order("created_at"),
    supabase.from("status_history").select("*").eq("request_id", id).order("changed_at").order("id"),
    supabase.from("request_notes").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.from("notifications_log").select("*").eq("request_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }),
    supabase.from("engineers").select("id, full_name, specialty").eq("is_active", true).order("full_name"),
    supabase.from("staff_members").select("user_id, full_name"),
  ]);

  if (requestRes.error) {
    console.error("[detail] load failed", requestRes.error);
    return (
      <Alert tone="error" live="assertive" title="This request did not load">
        Refresh the page to try again.{" "}
        <Link href="/staff" className="font-semibold underline">
          Back to all requests
        </Link>
      </Alert>
    );
  }
  if (!requestRes.data) notFound();

  const r = requestRes.data as RequestRow & { engineer: { full_name: string; phone: string } | null };
  const photos = photosRes.data ?? [];
  const history = historyRes.data ?? [];
  const notes = notesRes.data ?? [];
  const notifications = notificationsRes.data ?? [];
  const engineers = engineersRes.data ?? [];
  const staffNames = new Map((staffRes.data ?? []).map((s) => [s.user_id, s.full_name]));

  // Short-lived private links to the photos (valid 10 minutes).
  let photoUrls = new Map<string, string>();
  if (photos.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(PHOTO_RULES.bucket)
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        600,
      );
    if (signError) console.error("[detail] photo links failed", signError);
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) photoUrls.set(s.path, s.signedUrl);
    }
  }

  const location = [r.town, r.state].filter(Boolean).join(", ") || "Not provided";
  const details: [string, React.ReactNode][] =
    r.type === "quote"
      ? [
          ["Site type", labelFor(SITE_TYPES, r.site_type)],
          ["Product area", labelFor(PRODUCT_AREAS, r.product_area)],
          ["Water source", labelFor(WATER_SOURCES, r.water_source)],
          ["Location", location],
          ["Daily water need", labelFor(WATER_NEEDS, r.daily_water_need)],
          ["Timeline", labelFor(TIMELINES, r.preferred_timeline)],
          ["Notes", r.notes ?? "None"],
        ]
      : [
          ["Help needed", labelFor(ISSUE_TYPES, r.issue_type)],
          ["Equipment or site", r.equipment_or_site ?? ""],
          ["Location", location],
          ["Description", r.description ?? ""],
        ];

  return (
    <div className="space-y-6">
      <Link href="/staff" className="inline-block text-sm font-semibold text-brand-700 hover:underline">
        Back to all requests
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-900">{r.reference}</h1>
          <p className="mt-1 text-muted">Received {formatDateTime(r.created_at)}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TypeBadge type={r.type} />
            <UrgencyBadge urgency={r.urgency} />
            <StatusBadge status={r.status} />
          </div>
        </div>
        <p className="text-sm">
          Engineer: <strong>{r.engineer?.full_name ?? "Unassigned"}</strong>
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <aside className="rounded-lg border-2 border-brand-200 bg-white p-5 lg:sticky lg:top-4 lg:order-2">
          <UpdatePanel
            requestId={r.id}
            currentStatus={r.status}
            currentEngineerId={r.assigned_engineer_id}
            engineers={engineers}
          />
        </aside>

        <div className="space-y-6 lg:order-1">
          <Section title="Customer">
            <DetailList
              items={[
                ["Name", r.full_name],
                ["Company", r.company ?? "Not provided"],
                [
                  "Email",
                  <a key="e" href={`mailto:${r.email}`} className="text-brand-700 underline">
                    {r.email}
                  </a>,
                ],
                [
                  "Phone",
                  <a key="p" href={`tel:${r.phone_normalized}`} className="text-brand-700 underline">
                    {formatNgPhone(r.phone)}
                  </a>,
                ],
              ]}
            />
          </Section>

          <Section title={r.type === "quote" ? "Quote details" : "Service details"}>
            <DetailList items={details} />
          </Section>

          {r.type === "service" && (
            <Section title={`Photos (${photos.length})`}>
              {photos.length === 0 ? (
                <p className="text-muted">The customer did not add photos.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((p, i) => {
                    const url = photoUrls.get(p.storage_path);
                    return (
                      <li key={p.id} className="overflow-hidden rounded-md border border-line bg-surface">
                        {url ? (
                          <a href={url} target="_blank" rel="noopener noreferrer" title="Open full size in a new tab">
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                            <img src={url} alt={`Customer photo ${i + 1}`} className="aspect-square w-full object-cover" />
                          </a>
                        ) : (
                          <div className="flex aspect-square items-center justify-center p-3 text-center text-sm text-muted">
                            Photo could not be loaded
                          </div>
                        )}
                        <p className="px-2 py-1 text-xs text-muted">{formatBytes(p.size_bytes)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          )}

          <Section title="Status history">
            <ol className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="border-l-4 border-teal-600 pl-4">
                  <p className="font-medium">
                    {h.from_status ? (
                      <>
                        {labelFor(STATUSES, h.from_status)} to {labelFor(STATUSES, h.to_status)}
                      </>
                    ) : (
                      "Request received"
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDateTime(h.changed_at)}, by{" "}
                    {h.changed_by ? (staffNames.get(h.changed_by) ?? "a staff member") : h.from_status ? "the system" : "the customer"}
                  </p>
                  {h.note && <p className="mt-1 text-sm">Public note: {h.note}</p>}
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Notes">
            {notes.length === 0 ? (
              <p className="text-muted">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className={`rounded-md border p-3 ${n.visibility === "internal" ? "border-amber-300 bg-amber-50" : "border-brand-200 bg-brand-50"}`}
                  >
                    <p className="text-xs font-semibold">
                      {n.visibility === "internal" ? "Internal (staff only)" : "Public (customer can see)"}
                      <span className="font-normal text-muted">
                        {" "}
                        {formatDateTime(n.created_at)}
                        {n.author_id && `, ${staffNames.get(n.author_id) ?? "staff"}`}
                      </span>
                    </p>
                    <p className="mt-1 whitespace-pre-line break-words">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Messages that would be sent">
            <p className="mb-3 text-sm text-muted">
              Simulated only. In this prototype nothing is actually emailed or sent on WhatsApp. These are the messages a
              live system would send at each step.
            </p>
            {notifications.length === 0 ? (
              <p className="text-muted">No messages yet.</p>
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n.id} className="rounded-md border border-line p-3">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span
                        className={`rounded px-1.5 py-0.5 font-semibold ${n.channel === "email" ? "bg-brand-100 text-brand-900" : "bg-teal-100 text-teal-700"}`}
                      >
                        {n.channel === "email" ? "Email" : "WhatsApp"}
                      </span>
                      <span className="break-all text-muted">to {n.channel === "whatsapp" ? formatNgPhone(n.recipient) : n.recipient}</span>
                      <span className="text-muted">{formatDateTime(n.created_at)}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">Not sent (simulated)</span>
                    </p>
                    {n.subject && <p className="mt-2 text-sm font-semibold">{n.subject}</p>}
                    <p className="mt-1 text-sm leading-relaxed">{n.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h2 className="mb-2 text-lg font-bold text-brand-900">{title}</h2>
      {children}
    </section>
  );
}
