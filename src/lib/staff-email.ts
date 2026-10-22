import "server-only";

import { after } from "next/server";

import { ISSUE_TYPES, PRODUCT_AREAS, URGENCIES, labelFor } from "@/lib/constants";
import type { IssueType, ProductArea, RequestType, RequestUrgency } from "@/lib/database.types";

// Emails staff when a new quote or service request arrives, using Resend
// (resend.com). Turned on by two environment variables:
//   RESEND_API_KEY       your Resend API key (secret)
//   STAFF_NOTIFY_EMAIL   who receives the alerts (comma-separate several)
// Optional:
//   STAFF_EMAIL_FROM     sender, default "Rain Bird Service Hub <onboarding@resend.dev>".
//                        Without your own verified domain, Resend only delivers
//                        to the email address your Resend account was created with.
//
// A failed email NEVER affects the customer: the request is already saved,
// and the email is sent after the reply has gone back to the browser.

export type NewRequestAlert = {
  reference: string;
  type: RequestType;
  urgency: RequestUrgency;
  /** product area (quotes) or issue type (service) */
  topic: string;
  summary: [string, string][];
  detailUrl: string;
};

const DEFAULT_FROM = "Rain Bird Service Hub <onboarding@resend.dev>";

export function staffEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = (process.env.STAFF_NOTIFY_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
  const from = process.env.STAFF_EMAIL_FROM?.trim() || DEFAULT_FROM;
  return { enabled: Boolean(apiKey) && to.length > 0, apiKey, to, from };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Builds the subject and body. Pure, so it can be tested. */
export function buildStaffEmail(alert: NewRequestAlert): { subject: string; text: string; html: string } {
  const kind = alert.type === "quote" ? "quote request" : "service request";
  const topic =
    alert.type === "quote"
      ? labelFor(PRODUCT_AREAS, alert.topic as ProductArea)
      : labelFor(ISSUE_TYPES, alert.topic as IssueType);
  const urgent = alert.type === "service" && (alert.urgency === "critical" || alert.urgency === "high");
  const urgencyLabel = labelFor(URGENCIES, alert.urgency).toUpperCase();

  const subject = `${urgent ? `${urgencyLabel}: ` : ""}New ${kind} ${alert.reference} (${topic})`;

  const text = [
    `New ${kind}: ${alert.reference}`,
    alert.type === "service" ? `Urgency: ${labelFor(URGENCIES, alert.urgency)}` : "",
    "",
    ...alert.summary.map(([label, value]) => `${label}: ${value}`),
    "",
    `Open it in the staff dashboard: ${alert.detailUrl}`,
    "",
    "Rain Bird Service Hub (concept prototype, demo data only)",
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");

  const rows = alert.summary
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#4b5b6a;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 0;color:#13212e;white-space:pre-line">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f9fb;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-top:6px solid ${urgent ? "#b91c1c" : "#0e7366"};padding:24px">
<p style="margin:0 0 4px;color:#4b5b6a;font-size:14px">New ${escapeHtml(kind)}</p>
<h1 style="margin:0 0 8px;color:#082a43;font-size:26px">${escapeHtml(alert.reference)}</h1>
${urgent ? `<p style="margin:0 0 16px;display:inline-block;background:#b91c1c;color:#ffffff;padding:4px 10px;font-weight:bold;font-size:13px">${escapeHtml(urgencyLabel)}</p>` : ""}
<table style="border-collapse:collapse;font-size:14px;margin:8px 0 20px">${rows}</table>
<a href="${escapeHtml(alert.detailUrl)}" style="display:inline-block;background:#0f4a75;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:bold">Open in staff dashboard</a>
<p style="margin:24px 0 0;color:#4b5b6a;font-size:12px">Rain Bird Service Hub. Concept prototype built for the Blueprint hackathon. Not an official Rain Bird Nigeria system.</p>
</div></body></html>`;

  return { subject, text, html };
}

/** Sends the alert. Never throws; returns whether it was sent. */
export async function sendStaffEmail(alert: NewRequestAlert): Promise<{ sent: boolean; reason?: string }> {
  const config = staffEmailConfig();
  if (!config.enabled || !config.apiKey) return { sent: false, reason: "not configured" };

  const email = buildStaffEmail(alert);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.from, to: config.to, subject: email.subject, text: email.text, html: email.html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[staff-email] Resend refused the email", res.status, detail.slice(0, 300));
      return { sent: false, reason: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[staff-email] sending failed", err);
    return { sent: false, reason: "network error" };
  }
}

/**
 * Sends the alert after the response has gone back to the customer.
 * Falls back to a background promise outside a request (e.g. tests).
 */
export function queueStaffEmail(alert: NewRequestAlert): void {
  if (!staffEmailConfig().enabled) return;
  const task = () => sendStaffEmail(alert).then(() => undefined);
  try {
    after(task);
  } catch {
    void task();
  }
}
