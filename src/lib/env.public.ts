// Settings that are safe for the browser. Next.js copies NEXT_PUBLIC_ values
// into the browser bundle at build time, so they must be read by their full
// literal name (process.env.NEXT_PUBLIC_...), not dynamically.

export class MissingEnvError extends Error {
  constructor(names: string[]) {
    super(
      `Missing environment variable(s): ${names.join(", ")}. ` +
        "Copy .env.example to .env.local and fill them in (see the setup guide).",
    );
    this.name = "MissingEnvError";
  }
}

export function getPublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0 || !url || !anonKey) throw new MissingEnvError(missing);

  if (!/^https?:\/\/.+/.test(url)) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must start with https://");
  }

  return { supabaseUrl: url.replace(/\/+$/, ""), supabaseAnonKey: anonKey };
}
