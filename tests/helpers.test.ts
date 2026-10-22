import { describe, expect, it } from "vitest";

import { dashboardHref, hasActiveFilters, pageRange, searchFilter } from "@/lib/dashboard";
import { formatAge, formatBytes, formatDateTime } from "@/lib/format";
import { hashIdentifier } from "@/lib/rate-limit";
import { cleanLine, cleanMultiline, cleanSearch } from "@/lib/sanitize";
import { checkPickedPhoto, checkUploadBlob, isValidPhotoPath, remainingPhotoSlots } from "@/lib/validation/photos";

const ID = "3f2b8c1e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";

describe("text cleaning", () => {
  it("collapses whitespace on one-line fields", () => {
    expect(cleanLine("  a \t b\n c  ")).toBe("a b c");
  });
  it("keeps paragraphs but limits blank lines", () => {
    expect(cleanMultiline("a\r\n\r\n\r\n\r\nb  c")).toBe("a\n\nb c");
  });
  it("removes tags and stray angle brackets", () => {
    expect(cleanLine("<img src=x onerror=alert(1)>hi <3")).toBe("hi 3");
  });
  it("keeps search text safe for database filters", () => {
    expect(cleanSearch("QT-1042")).toBe("QT-1042");
    expect(cleanSearch("a,b),full_name.eq.x")).toBe("a b full name.eq.x");
    expect(cleanSearch("x".repeat(100))).toHaveLength(60);
  });
});

describe("photos", () => {
  it("accepts photos and rejects other files", () => {
    expect(checkPickedPhoto({ name: "pump.jpg", type: "image/jpeg", size: 2_000_000 }).ok).toBe(true);
    expect(checkPickedPhoto({ name: "IMG_1.HEIC", type: "", size: 2_000_000 }).ok).toBe(true);
    expect(checkPickedPhoto({ name: "virus.exe", type: "application/x-msdownload", size: 100 }).ok).toBe(false);
    expect(checkPickedPhoto({ name: "huge.jpg", type: "image/jpeg", size: 30 * 1024 * 1024 }).ok).toBe(false);
    expect(checkPickedPhoto({ name: "empty.jpg", type: "image/jpeg", size: 0 }).ok).toBe(false);
  });

  it("only uploads JPEG, PNG or WebP up to 5 MB", () => {
    expect(checkUploadBlob({ type: "image/jpeg", size: 5 * 1024 * 1024 }).ok).toBe(true);
    expect(checkUploadBlob({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 }).ok).toBe(false);
    expect(checkUploadBlob({ type: "image/gif", size: 1000 }).ok).toBe(false);
  });

  it("limits photos to 3", () => {
    expect(remainingPhotoSlots(0)).toBe(3);
    expect(remainingPhotoSlots(3)).toBe(0);
    expect(remainingPhotoSlots(5)).toBe(0);
  });

  it("only accepts storage paths inside the request's own folder", () => {
    expect(isValidPhotoPath(`${ID}/a1b2c3.jpg`, ID)).toBe(true);
    expect(isValidPhotoPath(`${ID}/../other.jpg`, ID)).toBe(false);
    expect(isValidPhotoPath(`${ID}/x.exe`, ID)).toBe(false);
    expect(isValidPhotoPath(`00000000-0000-4000-8000-000000000000/a.jpg`, ID)).toBe(false);
    expect(isValidPhotoPath(`${ID}/sub/a.jpg`, ID)).toBe(false);
  });
});

describe("dashboard helpers", () => {
  const none = { type: undefined, status: undefined, urgency: undefined, engineer: undefined, q: undefined, page: 1 };

  it("builds a search filter across reference, name and company", () => {
    expect(searchFilter("Lekki")).toBe("reference.ilike.%Lekki%,full_name.ilike.%Lekki%,company.ilike.%Lekki%");
  });

  it("builds links that keep filters", () => {
    expect(dashboardHref(none)).toBe("/staff");
    expect(dashboardHref({ ...none, urgency: "critical" }, { page: 2 })).toBe("/staff?urgency=critical&page=2");
    expect(dashboardHref({ ...none, q: "Ada" }, { q: undefined })).toBe("/staff");
  });

  it("knows when filters are active", () => {
    expect(hasActiveFilters(none)).toBe(false);
    expect(hasActiveFilters({ ...none, status: "open" })).toBe(true);
  });

  it("works out page ranges", () => {
    expect(pageRange(1, 0)).toEqual({ from: 0, to: 0, pages: 1 });
    expect(pageRange(1, 20)).toEqual({ from: 1, to: 20, pages: 1 });
    expect(pageRange(2, 60)).toEqual({ from: 26, to: 50, pages: 3 });
  });
});

describe("formatting", () => {
  it("shows dates in Lagos time", () => {
    expect(formatDateTime("2026-10-21T13:05:00Z")).toBe("21 Oct 2026, 2:05 pm");
    expect(formatDateTime("not a date")).toBe("");
  });
  it("shows how long ago", () => {
    const now = new Date("2026-10-21T12:00:00Z");
    expect(formatAge("2026-10-21T11:59:40Z", now)).toBe("just now");
    expect(formatAge("2026-10-21T09:00:00Z", now)).toBe("3 hours ago");
    expect(formatAge("2026-10-19T12:00:00Z", now)).toBe("2 days ago");
  });
  it("shows file sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("rate limiting", () => {
  it("never stores the raw IP address", () => {
    const hashed = hashIdentifier("102.89.1.2", "a-very-long-secret-salt-value-123456");
    expect(hashed).toHaveLength(32);
    expect(hashed).not.toContain("102.89");
    expect(hashIdentifier("102.89.1.2", "a-very-long-secret-salt-value-123456")).toBe(hashed);
    expect(hashIdentifier("102.89.1.2", "another-very-long-secret-salt-value-99")).not.toBe(hashed);
  });
});
