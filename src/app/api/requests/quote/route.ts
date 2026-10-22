import { MESSAGES, clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { queueStaffEmail } from "@/lib/staff-email";
import { saveRequest } from "@/lib/submissions";
import { quoteSummary } from "@/lib/summaries";
import { fieldErrors } from "@/lib/validation/common";
import { quoteSchema } from "@/lib/validation/quote";

export const dynamic = "force-dynamic";

// POST /api/requests/quote  ->  { ok: true, reference: "QT-1042" }
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(MESSAGES.forbidden, 403);

  const limit = await checkRateLimit("submitQuote", clientIp(request));
  if (!limit.allowed) return fail(MESSAGES.rateLimited, 429, { retryAfterSeconds: limit.retryAfterSeconds });

  const body = await readJson(request);
  if (body.response) return body.response;

  const parsed = quoteSchema.safeParse(body.data);
  if (!parsed.success) {
    return fail(MESSAGES.invalid, 400, { fieldErrors: fieldErrors(parsed.error) });
  }

  const d = parsed.data;
  try {
    const { id, reference } = await saveRequest({
      type: "quote",
      full_name: d.full_name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      state: d.state,
      town: d.town,
      site_type: d.site_type,
      product_area: d.product_area,
      water_source: d.water_source,
      daily_water_need: d.daily_water_need,
      preferred_timeline: d.preferred_timeline,
      notes: d.notes,
    });
    // Email staff in the background (only if email alerts are set up).
    queueStaffEmail({
      reference,
      type: "quote",
      urgency: "normal",
      topic: d.product_area,
      summary: quoteSummary(d),
      detailUrl: `${new URL(request.url).origin}/staff/requests/${id}`,
    });
    return ok({ reference }, 201);
  } catch {
    return fail(MESSAGES.server, 500);
  }
}
