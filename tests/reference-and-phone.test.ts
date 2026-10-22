import { describe, expect, it } from "vitest";

import { formatNgPhone, normalizeNgPhone } from "@/lib/phone";
import { isValidReference, normalizeReference, referencePrefix, typeFromReference } from "@/lib/reference";

describe("reference numbers", () => {
  it.each([
    ["QT-1042", "QT-1042"],
    ["qt-1042", "QT-1042"],
    ["QT1042", "QT-1042"],
    [" sv 1042 ", "SV-1042"],
    ["SV--7", "SV-7"],
    ["QT-0042", "QT-42"],
  ])("normalises %j to %s", (input, expected) => {
    expect(normalizeReference(input)).toBe(expected);
  });

  it.each(["", "RB-1042", "QT-", "QT-12a", "QT-1234567890", "1042", "QT-1 OR 1=1", null, undefined])(
    "rejects %j",
    (input) => {
      expect(normalizeReference(input)).toBeNull();
      expect(isValidReference(input)).toBe(false);
    },
  );

  it("maps types to prefixes and back", () => {
    expect(referencePrefix("quote")).toBe("QT");
    expect(referencePrefix("service")).toBe("SV");
    expect(typeFromReference("qt1001")).toBe("quote");
    expect(typeFromReference("SV-1001")).toBe("service");
    expect(typeFromReference("XX-1")).toBeNull();
  });
});

// These cases match normalize_ng_phone() in the database. If the two ever
// disagree, tracking by phone number would silently stop working.
describe("Nigerian phone numbers", () => {
  it.each([
    ["08031234567", "+2348031234567"],
    ["0803 123 4567", "+2348031234567"],
    ["0803-123-4567", "+2348031234567"],
    ["+234 803 123 4567", "+2348031234567"],
    ["2348031234567", "+2348031234567"],
    ["8031234567", "+2348031234567"],
    ["(0)803 123 4567", "+2348031234567"],
    ["0812 345 6789", "+2348123456789"],
  ])("normalises %j", (input, expected) => {
    expect(normalizeNgPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "+44 20 7946 0958", "080312345678", "00000000000", "abc"])("rejects %j", (input) => {
    expect(normalizeNgPhone(input)).toBeNull();
  });

  it("formats numbers the way people read them", () => {
    expect(formatNgPhone("+2348031234567")).toBe("0803 123 4567");
    expect(formatNgPhone("not a phone")).toBe("not a phone");
  });
});
