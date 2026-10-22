import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildStaffEmail, queueStaffEmail, sendStaffEmail, staffEmailConfig } from "@/lib/staff-email";

const alert = {
  reference: "SV-1042",
  type: "service" as const,
  urgency: "critical" as const,
  topic: "emergency_repair",
  summary: [
    ["Name", "Hauwa Lawal"],
    ["Description", "Fire pump <b>won't</b> start & panel is red"],
  ] as [string, string][],
  detailUrl: "https://rainbird-service-hub.vercel.app/staff/requests/3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f",
};

const ENV_KEYS = ["RESEND_API_KEY", "STAFF_NOTIFY_EMAIL", "STAFF_EMAIL_FROM"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  for (const k of ENV_KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("staff email content", () => {
  it("puts urgency and reference in the subject for urgent service requests", () => {
    const email = buildStaffEmail(alert);
    expect(email.subject).toBe("CRITICAL: New service request SV-1042 (Emergency repair)");
  });

  it("keeps quote subjects calm and names the product area", () => {
    const email = buildStaffEmail({ ...alert, reference: "QT-1001", type: "quote", urgency: "normal", topic: "solar_pumps" });
    expect(email.subject).toBe("New quote request QT-1001 (Solar pumps)");
  });

  it("includes every detail and the dashboard link", () => {
    const email = buildStaffEmail(alert);
    expect(email.text).toContain("Name: Hauwa Lawal");
    expect(email.text).toContain(alert.detailUrl);
    expect(email.html).toContain(alert.detailUrl);
  });

  it("escapes customer text so it cannot inject HTML into the email", () => {
    const { html } = buildStaffEmail(alert);
    expect(html).not.toContain("<b>won't</b>");
    expect(html).toContain("&lt;b&gt;won&#39;t&lt;/b&gt; start &amp; panel");
  });
});

describe("staff email sending", () => {
  it("is off until both settings are present", () => {
    expect(staffEmailConfig().enabled).toBe(false);
    process.env.RESEND_API_KEY = "re_test";
    expect(staffEmailConfig().enabled).toBe(false);
    process.env.STAFF_NOTIFY_EMAIL = "not-an-email";
    expect(staffEmailConfig().enabled).toBe(false);
    process.env.STAFF_NOTIFY_EMAIL = "staff@example.com, second@example.com";
    expect(staffEmailConfig()).toMatchObject({ enabled: true, to: ["staff@example.com", "second@example.com"] });
  });

  it("does nothing when not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await sendStaffEmail(alert)).toEqual({ sent: false, reason: "not configured" });
    queueStaffEmail(alert);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends to Resend with the key, recipients and default sender", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.STAFF_NOTIFY_EMAIL = "staff@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"x"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendStaffEmail(alert)).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(String(init.body));
    expect(body.to).toEqual(["staff@example.com"]);
    expect(body.from).toBe("Rain Bird Service Hub <onboarding@resend.dev>");
    expect(body.subject).toContain("SV-1042");
  });

  it("never throws when Resend refuses or the network fails", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.STAFF_NOTIFY_EMAIL = "staff@example.com";
    vi.spyOn(console, "error").mockImplementation(() => {});

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad key", { status: 401 })));
    expect(await sendStaffEmail(alert)).toEqual({ sent: false, reason: "HTTP 401" });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sendStaffEmail(alert)).toEqual({ sent: false, reason: "network error" });
  });

  it("queues in the background outside a request without throwing", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.STAFF_NOTIFY_EMAIL = "staff@example.com";
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(() => queueStaffEmail(alert)).not.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
