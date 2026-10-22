import { MESSAGES, clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { queueStaffEmail } from "@/lib/staff-email";
import { saveRequest } from "@/lib/submissions";
import { serviceSummary } from "@/lib/summaries";
import { fieldErrors } from "@/lib/validation/common";
import { serviceSchema } from "@/lib/validation/service";

export const dynamic = "force-dynamic";

// POST /api/requests/service  ->  { ok: true, reference: "SV-1042", uploadId: "<uuid>" }
// uploadId is the new request's private ID. The browser needs it to upload
// photos into that request's folder within the next 30 minutes.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(MESSAGES.forbidden, 403);

  const limit = await checkRateLimit("submitService", clientIp(request));
  if (!limit.allowed) return fail(MESSAGES.rateLimited, 429, { retryAfterSeconds: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (body.response) return body.response;

  const parsed = serviceSchema.safeParse(body.data);
  if (!parsed.success) {
    return fail(MESSAGES.invalid, 400, { fieldErrors: fieldErrors(parsed.error) });
  }

  const d = parsed.data;
  try {
    const { id, reference } = await saveRequest({
      type: "service",
      urgency: d.urgency,
      full_name: d.full_name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      state: d.state,
      town: d.town,
      equipment_or_site: d.equipment_or_site,
      issue_type: d.issue_type,
      description: d.description,
    });
    // Email staff in the background (only if email alerts are set up).
    // Photos upload a moment later, so the email links to the request page.
    queueStaffEmail({
      reference,
      type: "service",
      urgency: d.urgency,
      topic: d.issue_type,
      summary: serviceSummary(d),
      detailUrl: `${new URL(request.url).origin}/staff/requests/${id}`,
    });
    return ok({ reference, uploadId: id }, 201);
  } catch {
    return fail(MESSAGES.server, 500);
  }
}
