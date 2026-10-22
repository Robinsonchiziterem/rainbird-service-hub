import { NextResponse } from "next/server";

import { runSetupChecks } from "@/lib/setup-check";

export const dynamic = "force-dynamic";

// GET /api/health  ->  { ok: boolean, checks: [...] }
// Returns 200 when every check passes, 503 otherwise.
export async function GET() {
  try {
    const checks = await runSetupChecks();
    const ok = checks.every((c) => c.ok || c.optional);
    return NextResponse.json({ ok, checks }, { status: ok ? 200 : 503 });
  } catch {
    return NextResponse.json(
      { ok: false, checks: [], error: "The setup check could not run. Is Supabase reachable?" },
      { status: 503 },
    );
  }
}
