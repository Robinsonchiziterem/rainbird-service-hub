import "server-only";

import { PHOTO_RULES } from "@/lib/constants";
import { MissingEnvError } from "@/lib/env.public";
import { getServerEnv } from "@/lib/env.server";
import { staffEmailConfig } from "@/lib/staff-email";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicSupabase } from "@/lib/supabase/public";

export type SetupCheck = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
  fix?: string;
  /** Optional extras never make the overall check fail. */
  optional?: boolean;
};

// Runs a short list of checks that confirm Phase 1 setup worked.
// It never returns secret values, only pass/fail and a hint.
export async function runSetupChecks(): Promise<SetupCheck[]> {
  const checks: SetupCheck[] = [];

  // 1. Environment variables
  try {
    getServerEnv();
    checks.push({ id: "env", label: "Environment variables", ok: true, detail: "All 4 values are set." });
  } catch (err) {
    checks.push({
      id: "env",
      label: "Environment variables",
      ok: false,
      detail: err instanceof MissingEnvError || err instanceof Error ? err.message : "Could not read settings.",
      fix: "Copy .env.example to .env.local, fill in the values, then restart `npm run dev`.",
    });
    return checks; // nothing else can run without them
  }

  // 2. Supabase can be reached at all (fails fast instead of giving misleading hints)
  {
    const { supabaseUrl, supabaseAnonKey } = getServerEnv();
    let reachable = false;
    let detail = "";
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: { apikey: supabaseAnonKey },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      reachable = res.status < 500;
      detail = reachable ? "Supabase is responding." : `Supabase answered with an error (HTTP ${res.status}).`;
    } catch {
      detail = "Could not connect to your Supabase URL within 8 seconds.";
    }
    checks.push({
      id: "reachable",
      label: "Connection to Supabase",
      ok: reachable,
      detail,
      fix: reachable
        ? undefined
        : "Check NEXT_PUBLIC_SUPABASE_URL in .env.local, your internet connection, and that the project is not paused in the Supabase dashboard.",
    });
    if (!reachable) return checks;
  }

  const admin = getAdminSupabase();

  // 3. Tables exist and engineers are seeded (migrations 0001 + 0004)
  {
    const { count, error } = await admin.from("engineers").select("id", { count: "exact", head: true });
    if (error) {
      checks.push({
        id: "schema",
        label: "Database tables",
        ok: false,
        detail: "Could not read the engineers table.",
        fix: "Run supabase/migrations/0001_schema.sql in the Supabase SQL Editor.",
      });
    } else {
      checks.push({
        id: "schema",
        label: "Database tables and demo engineers",
        ok: (count ?? 0) >= 4,
        detail: `${count ?? 0} engineer(s) found.`,
        fix: (count ?? 0) >= 4 ? undefined : "Run supabase/migrations/0004_engineers_and_staff.sql.",
      });
    }
  }

  // 4. Security functions exist (migration 0002)
  {
    const { error } = await admin.rpc("check_rate_limit", {
      p_key: "setup-check",
      p_limit: 1000,
      p_window_seconds: 60,
    });
    checks.push({
      id: "functions",
      label: "Security rules and functions",
      ok: !error,
      detail: error ? "The check_rate_limit function is missing." : "Functions are installed.",
      fix: error ? "Run supabase/migrations/0002_security_and_functions.sql." : undefined,
    });
  }

  // 5. The public really cannot read requests (Row Level Security works)
  {
    const { data, error } = await getPublicSupabase().from("requests").select("id").limit(1);
    // 42501 = "permission denied", which is exactly what we want here.
    const blocked = (error?.code === "42501") || (!error && Array.isArray(data) && data.length === 0);
    const exposed = !error && Array.isArray(data) && data.length > 0;
    checks.push({
      id: "rls",
      label: "Public cannot read requests",
      ok: blocked,
      detail: blocked
        ? "The public key is blocked from reading the requests table, as intended."
        : exposed
          ? "WARNING: the public key can read requests. Customer data would be exposed."
          : "Could not confirm. The requests table may not exist yet.",
      fix: blocked ? undefined : "Run (or re-run) supabase/migrations/0001 and 0002 in order.",
    });
  }

  // 6. Private photo bucket (migration 0003)
  {
    const { data, error } = await admin.storage.getBucket(PHOTO_RULES.bucket);
    const ok = !error && data !== null && data.public === false;
    checks.push({
      id: "storage",
      label: "Private photo storage",
      ok,
      detail: ok
        ? `Bucket "${PHOTO_RULES.bucket}" exists and is private.`
        : `Bucket "${PHOTO_RULES.bucket}" is missing or public.`,
      fix: ok ? undefined : "Run supabase/migrations/0003_storage.sql.",
    });
  }

  // 7. Demo staff login is linked
  {
    const { count, error } = await admin.from("staff_members").select("user_id", { count: "exact", head: true });
    const ok = !error && (count ?? 0) >= 1;
    checks.push({
      id: "staff",
      label: "Demo staff account",
      ok,
      detail: ok ? `${count} staff account(s) linked.` : "No staff account is linked yet.",
      fix: ok
        ? undefined
        : "Create demo.staff@example.com in Authentication > Users, then re-run 0004_engineers_and_staff.sql.",
    });
  }

  // 8. Optional: email alerts to staff for new requests
  {
    const email = staffEmailConfig();
    checks.push({
      id: "email",
      label: "Email alerts to staff (optional)",
      ok: email.enabled,
      optional: true,
      detail: email.enabled
        ? `New requests are emailed to ${email.to.length} address(es).`
        : "Not set up. New requests only appear in the staff dashboard.",
      fix: email.enabled
        ? undefined
        : "Add RESEND_API_KEY and STAFF_NOTIFY_EMAIL (see README, 'Email alerts'), then redeploy.",
    });
  }

  return checks;
}
