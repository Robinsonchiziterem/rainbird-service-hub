import "server-only";

import { MissingEnvError, getPublicEnv } from "./env.public";

// Secret settings. The "server-only" import above makes the build fail if
// this file is ever imported into code that runs in the browser.
export function getServerEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const rateLimitSalt = process.env.RATE_LIMIT_SALT;

  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!rateLimitSalt) missing.push("RATE_LIMIT_SALT");
  if (missing.length > 0 || !serviceRoleKey || !rateLimitSalt) throw new MissingEnvError(missing);

  if (rateLimitSalt.length < 32) {
    throw new Error("RATE_LIMIT_SALT must be at least 32 characters long.");
  }

  return { ...getPublicEnv(), serviceRoleKey, rateLimitSalt };
}
