"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export function SignOutButton({ variant = "quiet" }: { variant?: "quiet" | "secondary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await getBrowserSupabase().auth.signOut();
    } finally {
      router.replace("/staff/login");
      router.refresh();
    }
  };

  return (
    <Button type="button" variant={variant} onClick={signOut} loading={busy} loadingText="Logging out" className="px-3">
      Log out
    </Button>
  );
}
