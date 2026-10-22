import { z } from "zod";

import { MESSAGES, fail, isSameOrigin, ok, readJson } from "@/lib/http";
import { getServerSupabase } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/common";
import { staffUpdateSchema } from "@/lib/validation/staff";

export const dynamic = "force-dynamic";

// POST /api/staff/requests/:id  { status, engineer, public_note, internal_note }
// Runs AS the logged-in staff member. The database function checks they are
// staff, saves everything in one step, and records history + notifications.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return fail(MESSAGES.forbidden, 403);

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail("Request not found.", 404);

  const body = await readJson(request, 12 * 1024);
  if (body.response) return body.response;

  const parsed = staffUpdateSchema.safeParse(body.data);
  if (!parsed.success) return fail(MESSAGES.invalid, 400, { fieldErrors: fieldErrors(parsed.error) });

  const supabase = await getServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return fail(MESSAGES.unauthorised, 401);

  const { data: current, error: readError } = await supabase
    .from("requests")
    .select("status, assigned_engineer_id")
    .eq("id", id)
    .maybeSingle();
  if (readError) {
    console.error("[staff update] read failed", readError);
    return fail(MESSAGES.server, 500);
  }
  if (!current) return fail("Request not found, or you do not have access to it.", 404);

  const d = parsed.data;
  const statusChanged = d.status !== current.status;
  const assignEngineer = d.engineer !== "" && d.engineer !== "unassigned" && d.engineer !== current.assigned_engineer_id;
  const clearEngineer = d.engineer === "unassigned" && current.assigned_engineer_id !== null;

  if (!statusChanged && !assignEngineer && !clearEngineer && !d.public_note && !d.internal_note) {
    return fail("Nothing has changed. Pick a new status or engineer, or write a note.", 400);
  }

  const { error } = await supabase.rpc("staff_update_request", {
    p_request_id: id,
    ...(statusChanged ? { p_status: d.status } : {}),
    ...(assignEngineer ? { p_engineer_id: d.engineer } : {}),
    p_clear_engineer: clearEngineer,
    ...(d.public_note ? { p_public_note: d.public_note } : {}),
    ...(d.internal_note ? { p_internal_note: d.internal_note } : {}),
  });

  if (error) {
    console.error("[staff update] rpc failed", { code: error.code, message: error.message });
    if (error.code === "42501") return fail(MESSAGES.forbidden, 403);
    if (error.code === "P0002") return fail(error.message.includes("Engineer") ? "That engineer was not found." : "Request not found.", 404);
    return fail(MESSAGES.server, 500);
  }

  // Read back the result so the page can confirm exactly what happened.
  const { data: updated } = await supabase.from("requests").select("status").eq("id", id).maybeSingle();
  return ok({ status: updated?.status ?? d.status });
}
