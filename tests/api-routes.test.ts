import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Fakes for the database and rate limiter -------------------------------
// The routes are tested on their own: no real Supabase is needed.

const rpc = vi.fn();
const rateLimit = vi.fn();
const saveRequest = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: (...args: unknown[]) => rateLimit(...args) }));
vi.mock("@/lib/submissions", () => ({ saveRequest: (...args: unknown[]) => saveRequest(...args) }));

const { POST: track } = await import("@/app/api/track/route");
const { POST: submitQuote } = await import("@/app/api/requests/quote/route");
const { POST: submitService } = await import("@/app/api/requests/service/route");

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", origin: "http://localhost:3000", ...headers },
    body: text,
  });
}

const foundRow = {
  reference: "SV-1001",
  type: "service",
  status: "assigned",
  submitted_at: "2026-10-20T09:00:00Z",
  updated_at: "2026-10-20T10:00:00Z",
  summary: "emergency_repair",
  engineer_first_name: "Tunde",
  timeline: [
    { status: "received", at: "2026-10-20T09:00:00Z" },
    { status: "assigned", at: "2026-10-20T10:00:00Z" },
  ],
  public_notes: [{ body: "On the way", at: "2026-10-20T10:00:00Z" }],
};

beforeEach(() => {
  rpc.mockReset();
  saveRequest.mockReset();
  rateLimit.mockReset();
  rateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
});

describe("POST /api/track", () => {
  it("returns the timeline when reference AND contact match", async () => {
    rpc.mockResolvedValue({ data: foundRow, error: null });
    const res = await track(post("/api/track", { reference: "sv1001", contact: "0803 123 4567" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.request.reference).toBe("SV-1001");
    expect(json.request.stages.map((s: { state: string }) => s.state)).toEqual([
      "complete",
      "current",
      "upcoming",
      "upcoming",
    ]);
    // The lookup used the cleaned reference and the contact as typed.
    expect(rpc).toHaveBeenCalledWith("track_request", { p_reference: "SV-1001", p_contact: "0803 123 4567" });
  });

  it("gives the SAME answer for a wrong contact and a reference that does not exist", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    const wrongContact = await track(post("/api/track", { reference: "SV-1001", contact: "someone@else.com" }));
    const noSuchRef = await track(post("/api/track", { reference: "SV-999999", contact: "a@b.com" }));
    expect(wrongContact.status).toBe(404);
    expect(noSuchRef.status).toBe(404);
    expect(await wrongContact.json()).toEqual(await noSuchRef.json());
  });

  it("returns field errors for bad input without touching the database", async () => {
    const res = await track(post("/api/track", { reference: "hello", contact: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors.reference).toBeTruthy();
    expect(json.fieldErrors.contact).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("blocks callers who are over the rate limit", async () => {
    rateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 600 });
    const res = await track(post("/api/track", { reference: "SV-1001", contact: "a@b.com" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("also limits guesses against a single reference", async () => {
    rateLimit.mockImplementation(async (name: string) => ({ allowed: name !== "trackPerReference", retryAfterSeconds: 600 }));
    const res = await track(post("/api/track", { reference: "SV-1001", contact: "a@b.com" }));
    expect(res.status).toBe(429);
  });

  it("shows a friendly message, not a raw error, when the database fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "connection refused", code: "08006" } });
    const res = await track(post("/api/track", { reference: "SV-1001", contact: "a@b.com" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).not.toMatch(/connection refused/);
  });

  it("rejects requests from other websites", async () => {
    const res = await track(post("/api/track", { reference: "SV-1001", contact: "a@b.com" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("rejects broken JSON and oversized bodies", async () => {
    expect((await track(post("/api/track", "{not json"))).status).toBe(400);
    expect((await track(post("/api/track", { reference: "x".repeat(5000), contact: "a" }))).status).toBe(413);
  });
});

describe("POST /api/requests/quote", () => {
  const quote = {
    full_name: "Amaka Eze",
    company: "",
    email: "amaka@example.com",
    phone: "08031234567",
    website: "",
    site_type: "farm",
    product_area: "solar_pumps",
    water_source: "borehole",
    state: "Lagos",
    town: "Epe",
    daily_water_need: "not_sure",
    preferred_timeline: "asap",
    notes: "",
  };

  it("saves a valid quote and returns its reference", async () => {
    saveRequest.mockResolvedValue({ id: "x", reference: "QT-1042" });
    const res = await submitQuote(post("/api/requests/quote", quote));
    expect(res.status).toBe(201);
    expect((await res.json()).reference).toBe("QT-1042");
    expect(saveRequest).toHaveBeenCalledWith(expect.objectContaining({ type: "quote", company: null, notes: null }));
  });

  it("never sends a status, engineer or urgency from the public to the database", async () => {
    saveRequest.mockResolvedValue({ id: "x", reference: "QT-1043" });
    await submitQuote(post("/api/requests/quote", { ...quote, status: "done", urgency: "critical", assigned_engineer_id: "x" }));
    const saved = saveRequest.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(saved).not.toHaveProperty("status");
    expect(saved).not.toHaveProperty("urgency");
    expect(saved).not.toHaveProperty("assigned_engineer_id");
  });

  it("returns field errors and saves nothing for invalid data", async () => {
    const res = await submitQuote(post("/api/requests/quote", { ...quote, email: "bad", site_type: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(Object.keys(json.fieldErrors)).toEqual(expect.arrayContaining(["email", "site_type"]));
    expect(saveRequest).not.toHaveBeenCalled();
  });

  it("is rate limited", async () => {
    rateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 600 });
    expect((await submitQuote(post("/api/requests/quote", quote))).status).toBe(429);
    expect(saveRequest).not.toHaveBeenCalled();
  });

  it("hides database errors behind a friendly message", async () => {
    saveRequest.mockRejectedValue(new Error("duplicate key value violates unique constraint"));
    const res = await submitQuote(post("/api/requests/quote", quote));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/nothing was saved/i);
  });
});

describe("POST /api/requests/service", () => {
  it("returns the reference and the private upload ID for photos", async () => {
    saveRequest.mockResolvedValue({ id: "3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f", reference: "SV-1042" });
    const res = await submitService(
      post("/api/requests/service", {
        full_name: "Bola Ade",
        email: "bola@example.com",
        phone: "08021234567",
        equipment_or_site: "Booster pump",
        issue_type: "emergency_repair",
        urgency: "critical",
        description: "No water on the upper floors since 6am.",
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toMatchObject({ reference: "SV-1042", uploadId: "3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f" });
    expect(saveRequest).toHaveBeenCalledWith(expect.objectContaining({ type: "service", urgency: "critical" }));
  });
});
