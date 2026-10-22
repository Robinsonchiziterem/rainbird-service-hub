import { describe, expect, it } from "vitest";

import type { TrackingResult } from "@/lib/database.types";
import { buildTrackingView, parseTrackingResult } from "@/lib/tracking";

const base: TrackingResult = {
  reference: "SV-1001",
  type: "service",
  status: "received",
  submitted_at: "2026-10-20T09:00:00Z",
  updated_at: "2026-10-20T09:00:00Z",
  summary: "emergency_repair",
  engineer_first_name: null,
  timeline: [{ status: "received", at: "2026-10-20T09:00:00Z" }],
  public_notes: [],
};

describe("tracking timeline", () => {
  it("shows a new request as received with nothing else reached", () => {
    const view = buildTrackingView(base);
    expect(view.stages.map((s) => s.state)).toEqual(["current", "upcoming", "upcoming", "upcoming"]);
    expect(view.stages[0]?.at).toBe("2026-10-20T09:00:00Z");
    expect(view.stages[1]?.at).toBeNull();
    expect(view.progress).toBe(0);
    expect(view.summary).toBe("Emergency repair");
    expect(view.typeLabel).toBe("Service request");
  });

  it("marks earlier stages complete and shows their dates", () => {
    const view = buildTrackingView({
      ...base,
      status: "scheduled",
      engineer_first_name: "Tunde",
      timeline: [
        { status: "received", at: "2026-10-20T09:00:00Z" },
        { status: "assigned", at: "2026-10-20T10:00:00Z" },
        { status: "scheduled", at: "2026-10-20T11:00:00Z" },
      ],
    });
    expect(view.stages.map((s) => s.state)).toEqual(["complete", "complete", "current", "upcoming"]);
    expect(view.stages[2]?.at).toBe("2026-10-20T11:00:00Z");
    expect(view.progress).toBeCloseTo(2 / 3);
    expect(view.engineerFirstName).toBe("Tunde");
  });

  it("shows every stage complete when done", () => {
    const view = buildTrackingView({
      ...base,
      status: "done",
      timeline: [
        { status: "received", at: "2026-10-20T09:00:00Z" },
        { status: "assigned", at: "2026-10-20T10:00:00Z" },
        { status: "scheduled", at: "2026-10-20T11:00:00Z" },
        { status: "done", at: "2026-10-21T15:00:00Z" },
      ],
    });
    expect(view.stages.every((s) => s.state === "complete")).toBe(true);
    expect(view.progress).toBe(1);
  });

  it("handles a skipped stage (received straight to scheduled)", () => {
    const view = buildTrackingView({
      ...base,
      status: "scheduled",
      timeline: [
        { status: "received", at: "2026-10-20T09:00:00Z" },
        { status: "scheduled", at: "2026-10-20T11:00:00Z" },
      ],
    });
    expect(view.stages[1]?.state).toBe("complete");
    expect(view.stages[1]?.at).toBeNull();
  });

  it("handles a request that moved backwards, using the newest dates", () => {
    const view = buildTrackingView({
      ...base,
      status: "assigned",
      timeline: [
        { status: "received", at: "2026-10-20T09:00:00Z" },
        { status: "assigned", at: "2026-10-20T10:00:00Z" },
        { status: "scheduled", at: "2026-10-20T11:00:00Z" },
        { status: "assigned", at: "2026-10-20T12:00:00Z" },
      ],
    });
    expect(view.stages.map((s) => s.state)).toEqual(["complete", "current", "upcoming", "upcoming"]);
    expect(view.stages[1]?.at).toBe("2026-10-20T12:00:00Z");
    expect(view.stages[2]?.at).toBeNull();
  });

  it("labels quotes by product area", () => {
    const view = buildTrackingView({ ...base, reference: "QT-1001", type: "quote", summary: "solar_pumps" });
    expect(view.summary).toBe("Solar pumps");
    expect(view.typeLabel).toBe("Quote request");
  });
});

describe("reading the database reply", () => {
  it("treats null and junk as not found", () => {
    expect(parseTrackingResult(null)).toBeNull();
    expect(parseTrackingResult("nope")).toBeNull();
    expect(parseTrackingResult({ reference: "QT-1", status: "exploded", type: "quote" })).toBeNull();
    expect(parseTrackingResult({ reference: "QT-1", status: "done", type: "other" })).toBeNull();
  });

  it("fills in safe defaults for missing lists", () => {
    const parsed = parseTrackingResult({ reference: "QT-1", status: "done", type: "quote" });
    expect(parsed?.timeline).toEqual([]);
    expect(parsed?.public_notes).toEqual([]);
  });
});
