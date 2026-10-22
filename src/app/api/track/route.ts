import { MESSAGES, clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { TRACK_NOT_FOUND_MESSAGE, buildTrackingView, parseTrackingResult } from "@/lib/tracking";
import { fieldErrors } from "@/lib/validation/common";
import { trackSchema } from "@/lib/validation/track";

export const dynamic = "force-dynamic";

// POST /api/track  { reference, contact }
//   found      -> 200 { ok: true, request: TrackingView }
//   no match   -> 404 { ok: false, error: <same message whether or not the reference exists> }
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(MESSAGES.forbidden, 403);

  const ipLimit = await checkRateLimit("trackPerIp", clientIp(request));
  if (!ipLimit.allowed) return fail(MESSAGES.rateLimited, 429, { retryAfterSeconds: ipLimit.retryAfterSeconds });

  const body = await readJson(request, 2 * 1024);
  if (body.response) return body.response;

  const parsed = trackSchema.safeParse(body.data);
  if (!parsed.success) {
    return fail(MESSAGES.invalid, 400, { fieldErrors: fieldErrors(parsed.error) });
  }

  const { reference, contact } = parsed.data;

  const refLimit = await checkRateLimit("trackPerReference", reference);
  if (!refLimit.allowed) return fail(MESSAGES.rateLimited, 429, { retryAfterSeconds: refLimit.retryAfterSeconds });

  try {
    const { data, error } = await getAdminSupabase().rpc("track_request", {
      p_reference: reference,
      p_contact: contact,
    });
    if (error) throw error;

    const result = parseTrackingResult(data);
    if (!result) return fail(TRACK_NOT_FOUND_MESSAGE, 404);

    return ok({ request: buildTrackingView(result) });
  } catch (err) {
    console.error("[track] lookup failed", err);
    return fail("We could not check your request right now. Please try again in a moment.", 500);
  }
}
