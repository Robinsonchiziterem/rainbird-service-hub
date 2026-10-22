import { ISSUE_TYPES, PRODUCT_AREAS, STATUSES, labelFor } from "./constants";
import type { IssueType, ProductArea, RequestStatus, TrackingResult } from "./database.types";

// Turns the raw tracking data from the database into what the tracker shows:
// four stages, each complete, current or upcoming, with the date it happened.

export type TimelineStage = {
  status: RequestStatus;
  label: string;
  hint: string;
  state: "complete" | "current" | "upcoming";
  at: string | null;
};

export type TrackingView = {
  reference: string;
  typeLabel: string;
  summary: string;
  status: RequestStatus;
  statusLabel: string;
  submittedAt: string;
  updatedAt: string;
  engineerFirstName: string | null;
  stages: TimelineStage[];
  /** 0 to 1, how far along the pipe the water has reached. */
  progress: number;
  publicNotes: { body: string; at: string }[];
};

const ORDER: RequestStatus[] = STATUSES.map((s) => s.value);

export function buildTrackingView(result: TrackingResult): TrackingView {
  const currentIndex = Math.max(0, ORDER.indexOf(result.status));

  // Latest date each status was reached. If a request went backwards
  // (for example Scheduled back to Assigned), the newest date wins.
  const latestAt = new Map<RequestStatus, string>();
  for (const entry of result.timeline ?? []) {
    const previous = latestAt.get(entry.status);
    if (!previous || new Date(entry.at) >= new Date(previous)) {
      latestAt.set(entry.status, entry.at);
    }
  }

  const stages: TimelineStage[] = STATUSES.map((s, index) => {
    const state: TimelineStage["state"] =
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? s.value === "done"
            ? "complete"
            : "current"
          : "upcoming";
    return {
      status: s.value,
      label: s.label,
      hint: s.hint ?? "",
      state,
      // Only show a date for stages that are actually reached now.
      at: index <= currentIndex ? (latestAt.get(s.value) ?? null) : null,
    };
  });

  const summary =
    result.type === "quote"
      ? labelFor(PRODUCT_AREAS, result.summary as ProductArea)
      : labelFor(ISSUE_TYPES, result.summary as IssueType);

  return {
    reference: result.reference,
    typeLabel: result.type === "quote" ? "Quote request" : "Service request",
    summary,
    status: result.status,
    statusLabel: labelFor(STATUSES, result.status),
    submittedAt: result.submitted_at,
    updatedAt: result.updated_at,
    engineerFirstName: result.engineer_first_name ?? null,
    stages,
    progress: ORDER.length > 1 ? currentIndex / (ORDER.length - 1) : 1,
    publicNotes: result.public_notes ?? [],
  };
}

/** The same message for "wrong reference" and "wrong email/phone", on purpose. */
export const TRACK_NOT_FOUND_MESSAGE =
  "We could not find a request with those details. Check the reference number and use the same email or phone number you gave on the form.";

/** Safely reads what the database returned. Anything malformed counts as not found. */
export function parseTrackingResult(data: unknown): TrackingResult | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Partial<TrackingResult>;
  if (typeof r.reference !== "string" || typeof r.status !== "string" || !ORDER.includes(r.status)) {
    return null;
  }
  if (r.type !== "quote" && r.type !== "service") return null;
  return {
    reference: r.reference,
    type: r.type,
    status: r.status,
    submitted_at: String(r.submitted_at ?? ""),
    updated_at: String(r.updated_at ?? ""),
    summary: String(r.summary ?? ""),
    engineer_first_name: typeof r.engineer_first_name === "string" ? r.engineer_first_name : null,
    timeline: Array.isArray(r.timeline) ? r.timeline : [],
    public_notes: Array.isArray(r.public_notes) ? r.public_notes : [],
  };
}
