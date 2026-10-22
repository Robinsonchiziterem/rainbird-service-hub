import { z } from "zod";

import { PHOTO_RULES } from "@/lib/constants";
import { MESSAGES, clientIp, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicSupabase } from "@/lib/supabase/public";
import { isValidPhotoPath } from "@/lib/validation/photos";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  uploadId: z.uuid(),
  paths: z.array(z.string().max(200)).min(1).max(PHOTO_RULES.maxFiles),
});

// POST /api/requests/service/photos  ->  { ok: true, saved: 2 }
// Called after the browser has uploaded photos straight to storage.
// We look up each file's REAL size and type in storage (never trusting
// what the browser claims) and record it against the request.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(MESSAGES.forbidden, 403);

  const limit = await checkRateLimit("registerPhotos", clientIp(request));
  if (!limit.allowed) return fail(MESSAGES.rateLimited, 429, { retryAfterSeconds: limit.retryAfterSeconds });

  const body = await readJson(request, 4 * 1024);
  if (body.response) return body.response;

  const parsed = bodySchema.safeParse(body.data);
  if (!parsed.success) return fail("The photo details could not be read.", 400);

  const { uploadId, paths } = parsed.data;
  const uniquePaths = [...new Set(paths)];
  if (!uniquePaths.every((p) => isValidPhotoPath(p, uploadId))) {
    return fail("One of the photo paths is not valid.", 400);
  }

  try {
    const { data: objects, error: listError } = await getAdminSupabase()
      .storage.from(PHOTO_RULES.bucket)
      .list(uploadId, { limit: 10 });
    if (listError) throw listError;

    const publicDb = getPublicSupabase();
    let saved = 0;

    for (const path of uniquePaths) {
      const fileName = path.split("/")[1];
      const object = objects?.find((o) => o.name === fileName);
      const size = Number(object?.metadata?.size ?? 0);
      const mime = String(object?.metadata?.mimetype ?? "");
      if (!object || size <= 0 || size > PHOTO_RULES.maxBytes) continue;
      if (!(PHOTO_RULES.mimeTypes as readonly string[]).includes(mime)) continue;

      // Inserted with PUBLIC permissions: the database only allows it for a
      // service request created in the last 30 minutes with fewer than 3 photos.
      const { error } = await publicDb.from("request_photos").insert({
        request_id: uploadId,
        storage_path: path,
        mime_type: mime as (typeof PHOTO_RULES.mimeTypes)[number],
        size_bytes: size,
      });
      if (error) {
        console.error("[photos] could not record photo", { code: error.code, message: error.message });
        continue;
      }
      saved += 1;
    }

    return ok({ saved });
  } catch (err) {
    console.error("[photos] failed", err);
    return fail(MESSAGES.server, 500);
  }
}
