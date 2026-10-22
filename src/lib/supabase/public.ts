import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env.public";

// A server-side client that acts as the anonymous public. API routes use it to
// save new quote and service requests, so the database security rules apply
// exactly as they would to any member of the public: insert only, no reading.
export function getPublicSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
