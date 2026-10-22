import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env.public";

// Used by staff pages and staff API routes on the server. It reads the staff
// member's login cookie, so every query runs AS that staff member and the
// database security rules (is_staff) still apply.
export async function getServerSupabase() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. That is fine: the proxy
          // (added in Phase 3) refreshes the session cookie on each request.
        }
      },
    },
  });
}
