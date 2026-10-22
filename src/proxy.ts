import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import type { Database } from "@/lib/database.types";

// Runs before every staff page and staff API call.
//  * Keeps the staff login fresh (refreshes the session cookie).
//  * Sends anyone not logged in to /staff/login.
// Whether a logged-in user is actually STAFF is checked again on each page
// and by the database itself, so this is the first lock, not the only one.

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/staff");
  const isLogin = pathname === "/staff/login";

  if (!url || !anonKey) {
    if (isApi) return NextResponse.json({ ok: false, error: "The site is not configured yet." }, { status: 503 });
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL("/staff/login", request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  let loggedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    loggedIn = Boolean(data.user);
  } catch {
    loggedIn = false;
  }

  if (!loggedIn && !isLogin) {
    if (isApi) {
      return NextResponse.json({ ok: false, error: "Please log in again." }, { status: 401 });
    }
    const loginUrl = new URL("/staff/login", request.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (loggedIn && isLogin) {
    return NextResponse.redirect(new URL("/staff", request.url));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/staff/:path*", "/staff", "/api/staff/:path*"],
};
