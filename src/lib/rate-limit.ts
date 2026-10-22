import "server-only";

import { createHash } from "node:crypto";

import { getServerEnv } from "@/lib/env.server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Limits for the public endpoints. Counters live in the database (table
// rate_limits), so they work on Vercel where every request may run on a
// different server.
export const RATE_LIMITS = {
  submitQuote: { limit: 5, windowSeconds: 10 * 60 },
  submitService: { limit: 5, windowSeconds: 10 * 60 },
  registerPhotos: { limit: 10, windowSeconds: 10 * 60 },
  trackPerIp: { limit: 20, windowSeconds: 10 * 60 },
  // Stops someone guessing many emails/phones for one reference.
  trackPerReference: { limit: 10, windowSeconds: 10 * 60 },
} as const;

export type RateLimitName = keyof typeof RATE_LIMITS;

/** Hashes the IP (or other identifier) with a secret salt, so raw IPs are never stored. */
export function hashIdentifier(identifier: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${identifier}`).digest("hex").slice(0, 32);
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * Returns allowed=false when the caller is over the limit.
 * If the rate-limit check itself fails (for example the database is briefly
 * unreachable), we let the request through and log it, so a hiccup never
 * blocks a real customer with an urgent fault.
 */
export async function checkRateLimit(name: RateLimitName, identifier: string): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMITS[name];
  try {
    const { rateLimitSalt } = getServerEnv();
    const key = `${name}:${hashIdentifier(identifier, rateLimitSalt)}`;
    const { data, error } = await getAdminSupabase().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) throw error;
    return { allowed: data !== false, retryAfterSeconds: windowSeconds };
  } catch (err) {
    console.error(`[rate-limit] check failed for ${name}, allowing request`, err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
