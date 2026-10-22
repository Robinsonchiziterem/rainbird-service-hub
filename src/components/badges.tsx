import { REQUEST_TYPES, STATUSES, URGENCIES, labelFor } from "@/lib/constants";
import type { RequestStatus, RequestType, RequestUrgency } from "@/lib/database.types";

// Coloured labels. Colour is never the only signal: each badge shows its word.

const URGENCY_STYLES: Record<RequestUrgency, string> = {
  critical: "bg-red-700 text-white",
  high: "bg-amber-100 text-amber-900 ring-1 ring-amber-400",
  normal: "bg-slate-100 text-slate-800 ring-1 ring-slate-300",
  low: "bg-white text-slate-700 ring-1 ring-slate-300",
};

const STATUS_STYLES: Record<RequestStatus, string> = {
  received: "bg-brand-50 text-brand-800 ring-1 ring-brand-200",
  assigned: "bg-brand-100 text-brand-900 ring-1 ring-brand-200",
  scheduled: "bg-teal-100 text-teal-700 ring-1 ring-teal-500/40",
  done: "bg-teal-700 text-white",
};

const base = "inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold";

export function UrgencyBadge({ urgency }: { urgency: RequestUrgency }) {
  return <span className={`${base} ${URGENCY_STYLES[urgency]}`}>{labelFor(URGENCIES, urgency)}</span>;
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className={`${base} ${STATUS_STYLES[status]}`}>{labelFor(STATUSES, status)}</span>;
}

export function TypeBadge({ type }: { type: RequestType }) {
  return (
    <span className={`${base} ${type === "quote" ? "bg-white text-brand-700 ring-1 ring-brand-500" : "bg-white text-teal-700 ring-1 ring-teal-600"}`}>
      {labelFor(REQUEST_TYPES, type)}
    </span>
  );
}
