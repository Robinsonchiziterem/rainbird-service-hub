// Calls our own API routes from the browser and always returns a simple
// result, even when the connection drops. No page ever sees a raw error.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

const OFFLINE_MESSAGE =
  "We could not reach the server. Check your internet connection and try again. Nothing has been lost from the form.";

export async function postJson<T>(url: string, body: unknown, timeoutMs = 20000): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: OFFLINE_MESSAGE };
  }

  let json: Record<string, unknown> = {};
  try {
    json = (await response.json()) as Record<string, unknown>;
  } catch {
    // Non-JSON reply (for example a hosting error page).
  }

  if (response.ok && json.ok === true) {
    return { ok: true, data: json as T };
  }

  return {
    ok: false,
    status: response.status,
    error:
      typeof json.error === "string"
        ? json.error
        : "Something went wrong on our side. Please try again in a moment.",
    fieldErrors:
      json.fieldErrors && typeof json.fieldErrors === "object"
        ? (json.fieldErrors as Record<string, string>)
        : undefined,
  };
}
