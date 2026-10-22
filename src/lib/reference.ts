import type { RequestType } from "./database.types";

// Reference numbers look like QT-1042 (quotes) and SV-1042 (service).
// Customers type them in all sorts of ways, so we accept "qt1042",
// "QT 1042", " sv-1042 " and turn them into the standard form.

const REFERENCE_PATTERN = /^(QT|SV)[\s-]*(\d{1,9})$/;

export function normalizeReference(input: string | null | undefined): string | null {
  const cleaned = (input ?? "").trim().toUpperCase();
  const match = REFERENCE_PATTERN.exec(cleaned);
  if (!match) return null;
  const [, prefix, number] = match;
  return `${prefix}-${String(Number(number))}`;
}

export function isValidReference(input: string | null | undefined): boolean {
  return normalizeReference(input) !== null;
}

export function referencePrefix(type: RequestType): "QT" | "SV" {
  return type === "quote" ? "QT" : "SV";
}

export function typeFromReference(reference: string): RequestType | null {
  const normalized = normalizeReference(reference);
  if (!normalized) return null;
  return normalized.startsWith("QT-") ? "quote" : "service";
}
