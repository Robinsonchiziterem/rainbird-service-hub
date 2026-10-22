import "server-only";

import { NextResponse } from "next/server";

// Small helpers so every API route answers in the same, predictable way:
//   success: { ok: true, ...data }
//   failure: { ok: false, error: "Plain message", fieldErrors?: { field: "message" } }

export function ok<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(
  error: string,
  status: number,
  extra: { fieldErrors?: Record<string, string>; retryAfterSeconds?: number } = {},
) {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (extra.retryAfterSeconds) headers["Retry-After"] = String(extra.retryAfterSeconds);
  return NextResponse.json(
    { ok: false, error, ...(extra.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) },
    { status, headers },
  );
}

export const MESSAGES = {
  badJson: "The form data could not be read. Please refresh the page and try again.",
  tooLarge: "That submission is too large.",
  invalid: "Some answers need fixing. Check the highlighted fields.",
  rateLimited: "Too many attempts from your connection. Please wait a few minutes and try again.",
  server: "Something went wrong on our side and nothing was saved. Please try again in a moment.",
  unauthorised: "Please log in again.",
  forbidden: "Your account does not have staff access.",
} as const;

/**
 * Reads a JSON body, refusing anything over maxBytes.
 * Returns { data } or { response } (an error response to send back).
 */
export async function readJson(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<{ data: unknown; response?: undefined } | { data?: undefined; response: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { response: fail(MESSAGES.tooLarge, 413) };

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { response: fail(MESSAGES.badJson, 415) };
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return { response: fail(MESSAGES.badJson, 400) };
  }
  if (new TextEncoder().encode(text).length > maxBytes) return { response: fail(MESSAGES.tooLarge, 413) };

  try {
    return { data: JSON.parse(text) as unknown };
  } catch {
    return { response: fail(MESSAGES.badJson, 400) };
  }
}

/** Best guess at the visitor's IP address (Vercel sets x-forwarded-for). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Blocks form posts from other websites. Browsers always send an Origin
 * header on POST; if it is present it must match our own host.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
