import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";

export type StaffSession =
  | { kind: "staff"; userId: string; email: string; name: string; supabase: Awaited<ReturnType<typeof getServerSupabase>> }
  | { kind: "not-logged-in" }
  | { kind: "not-staff"; email: string };

/** Works out who is looking at a staff page, checking with the database. */
export async function getStaffSession(): Promise<StaffSession> {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { kind: "not-logged-in" };

  const { data: member } = await supabase
    .from("staff_members")
    .select("full_name")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!member) return { kind: "not-staff", email: data.user.email ?? "" };

  return {
    kind: "staff",
    userId: data.user.id,
    email: data.user.email ?? "",
    name: member.full_name,
    supabase,
  };
}
