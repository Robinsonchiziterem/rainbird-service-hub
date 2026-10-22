import { describe, expect, it } from "vitest";

import { fieldErrors } from "@/lib/validation/common";
import { quoteSchema } from "@/lib/validation/quote";
import { serviceSchema } from "@/lib/validation/service";
import { dashboardFilterSchema, loginSchema, safeStaffPath, staffUpdateSchema } from "@/lib/validation/staff";
import { trackSchema } from "@/lib/validation/track";

const validQuote = {
  full_name: "  Amaka   Eze ",
  company: "",
  email: " amaka@example.com ",
  phone: "0803 123 4567",
  website: "",
  site_type: "farm",
  product_area: "solar_pumps",
  water_source: "borehole",
  state: "Lagos",
  town: "Epe",
  daily_water_need: "from_5k_to_20k",
  preferred_timeline: "within_1_month",
  notes: "",
};

const validService = {
  full_name: "Bola Ade",
  company: "Demo Hotel",
  email: "bola@example.com",
  phone: "+2348021234567",
  website: "",
  equipment_or_site: "Booster pump room",
  state: "",
  town: "",
  issue_type: "emergency_repair",
  urgency: "critical",
  description: "Booster pump not starting at all.",
};

describe("quote form", () => {
  it("accepts a complete quote and cleans the text", () => {
    const result = quoteSchema.safeParse(validQuote);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.full_name).toBe("Amaka Eze");
    expect(result.data.email).toBe("amaka@example.com");
    expect(result.data.company).toBeNull();
    expect(result.data.notes).toBeNull();
  });

  it("gives a field-level message for every missing choice", () => {
    const result = quoteSchema.safeParse({ ...validQuote, site_type: "", product_area: "", state: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(errors.site_type).toMatch(/type of site/i);
    expect(errors.product_area).toMatch(/not sure/i);
    expect(errors.state).toMatch(/state/i);
  });

  it("rejects values that are not on the list", () => {
    const result = quoteSchema.safeParse({ ...validQuote, product_area: "nuclear_pumps" });
    expect(result.success).toBe(false);
  });

  it("rejects a bad email and a non-Nigerian phone", () => {
    const result = quoteSchema.safeParse({ ...validQuote, email: "not-an-email", phone: "+44 20 7946 0958" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(errors.email).toMatch(/valid email/i);
    expect(errors.phone).toMatch(/Nigerian/);
  });

  it("strips HTML and invisible characters from text", () => {
    const result = quoteSchema.safeParse({
      ...validQuote,
      full_name: "<script>alert(1)</script>Amaka​ Eze",
      notes: "Line one\n\n\n\nLine <b>two</b>",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.full_name).toBe("alert(1)Amaka Eze");
    expect(result.data.notes).toBe("Line one\n\nLine two");
  });

  it("treats a name that is only HTML as empty", () => {
    const result = quoteSchema.safeParse({ ...validQuote, full_name: "<b></b>" });
    expect(result.success).toBe(false);
  });

  it("enforces maximum lengths", () => {
    const result = quoteSchema.safeParse({ ...validQuote, notes: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("rejects bots that fill the hidden field", () => {
    const result = quoteSchema.safeParse({ ...validQuote, website: "http://spam.example" });
    expect(result.success).toBe(false);
  });
});

describe("service form", () => {
  it("accepts a complete service request with optional location left empty", () => {
    const result = serviceSchema.safeParse(validService);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.state).toBeNull();
    expect(result.data.town).toBeNull();
    expect(result.data.urgency).toBe("critical");
  });

  it("needs a description of at least 10 characters", () => {
    const result = serviceSchema.safeParse({ ...validService, description: "broken" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error).description).toMatch(/more detail/i);
  });

  it("needs an urgency and an issue type", () => {
    const result = serviceSchema.safeParse({ ...validService, urgency: "", issue_type: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(errors.urgency).toBeTruthy();
    expect(errors.issue_type).toBeTruthy();
  });

  it("rejects an unknown state", () => {
    expect(serviceSchema.safeParse({ ...validService, state: "Atlantis" }).success).toBe(false);
  });
});

describe("tracking form", () => {
  it("normalises the reference and accepts an email", () => {
    const result = trackSchema.safeParse({ reference: " qt 1042 ", contact: "a@b.com" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.reference).toBe("QT-1042");
  });

  it("accepts a phone number in any common format", () => {
    expect(trackSchema.safeParse({ reference: "SV-1", contact: "0803 123 4567" }).success).toBe(true);
    expect(trackSchema.safeParse({ reference: "SV-1", contact: "+234 803 123 4567" }).success).toBe(true);
  });

  it("explains the reference format when it is wrong", () => {
    const result = trackSchema.safeParse({ reference: "RB-1042", contact: "a@b.com" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error).reference).toMatch(/QT-1042/);
  });

  it("rejects contact text that is neither an email nor a phone number", () => {
    expect(trackSchema.safeParse({ reference: "QT-1", contact: "hello" }).success).toBe(false);
  });
});

describe("staff forms", () => {
  it("validates login", () => {
    expect(loginSchema.safeParse({ email: "demo.staff@example.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "nope", password: "" }).success).toBe(false);
  });

  it("validates a status update", () => {
    const ok = staffUpdateSchema.safeParse({
      status: "scheduled",
      engineer: "unassigned",
      public_note: " Visit on Monday ",
      internal_note: "",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.public_note).toBe("Visit on Monday");
      expect(ok.data.internal_note).toBeNull();
    }
    expect(staffUpdateSchema.safeParse({ status: "closed", engineer: "", public_note: "", internal_note: "" }).success).toBe(false);
    expect(staffUpdateSchema.safeParse({ status: "done", engineer: "bob", public_note: "", internal_note: "" }).success).toBe(false);
  });

  it("refuses unknown fields in a status update", () => {
    const result = staffUpdateSchema.safeParse({
      status: "done",
      engineer: "",
      public_note: "",
      internal_note: "",
      reference: "QT-1",
    });
    expect(result.success).toBe(false);
  });

  it("ignores bad dashboard filters instead of crashing", () => {
    const filters = dashboardFilterSchema.parse({
      type: "spaceship",
      status: "open",
      urgency: "critical",
      engineer: "not-a-uuid",
      q: "  Lekki,Palms) ",
      page: "-4",
    });
    expect(filters.type).toBeUndefined();
    expect(filters.status).toBe("open");
    expect(filters.urgency).toBe("critical");
    expect(filters.engineer).toBeUndefined();
    expect(filters.q).toBe("Lekki Palms");
    expect(filters.page).toBe(1);
  });

  it("only redirects back into the staff area after login", () => {
    expect(safeStaffPath("/staff/requests/abc")).toBe("/staff/requests/abc");
    expect(safeStaffPath("https://evil.example")).toBe("/staff");
    expect(safeStaffPath("//evil.example")).toBe("/staff");
    expect(safeStaffPath("/staff/login")).toBe("/staff");
    expect(safeStaffPath(null)).toBe("/staff");
  });
});
