import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getServerEnv } from "@/lib/env.server";

// The powerful "service role" client. It skips the security rules, so it is
// used ONLY inside API routes for two narrow jobs:
//   1. Customer tracking lookups (track_request), after rate limiting.
//   2. Rate-limit counters (check_rate_limit).
// It must never be imported by anything that runs in the browser.
let client: ReturnType<typeof createClient<Database>> | undefined;

export function getAdminSupabase() {
  if (!client) {
    const { supabaseUrl, serviceRoleKey } = getServerEnv();
    client = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
