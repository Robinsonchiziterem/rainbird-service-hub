"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getPublicEnv } from "@/lib/env.public";

// Used in the browser for two things only:
//   1. Staff login (stores the session in a cookie).
//   2. Customers uploading photos straight to Storage (as the public "anon"
//      role, which the security rules limit to their own new request).
let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function getBrowserSupabase() {
  if (!client) {
    const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
    client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return client;
}
