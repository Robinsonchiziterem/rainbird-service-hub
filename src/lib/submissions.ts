import "server-only";

import { randomUUID } from "node:crypto";

import type { RequestInsert } from "@/lib/database.types";
import { getPublicSupabase } from "@/lib/supabase/public";

export class SubmissionError extends Error {}

/**
 * Saves a new request using PUBLIC permissions (insert only), then asks the
 * database for its reference number using the new request's secret ID.
 */
export async function saveRequest(row: Omit<RequestInsert, "id">): Promise<{ id: string; reference: string }> {
  const supabase = getPublicSupabase();
  const id = randomUUID();

  const { error } = await supabase.from("requests").insert({ ...row, id });
  if (error) {
    console.error("[submit] insert failed", { code: error.code, message: error.message });
    throw new SubmissionError("insert failed");
  }

  const { data: reference, error: refError } = await supabase.rpc("reference_for_new_request", {
    p_request_id: id,
  });
  if (refError || typeof reference !== "string") {
    console.error("[submit] reference lookup failed", refError);
    throw new SubmissionError("reference lookup failed");
  }

  return { id, reference };
}
