// Nigerian phone number handling. This MUST behave exactly like the
// normalize_ng_phone() function in supabase/migrations/0001_schema.sql,
// because tracking compares numbers in this standard form.
//
// Accepts: 08031234567, 0803 123 4567, +234 803 123 4567, 2348031234567, 8031234567
// Returns: "+2348031234567", or null if it is not a valid Nigerian number.

export function normalizeNgPhone(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (/^234[1-9]\d{9}$/.test(digits)) return `+${digits}`;
  if (/^0[1-9]\d{9}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^[1-9]\d{9}$/.test(digits)) return `+234${digits}`;
  return null;
}

/** Shows +2348031234567 as 0803 123 4567, which is how most people read it. */
export function formatNgPhone(input: string | null | undefined): string {
  const normalized = normalizeNgPhone(input);
  if (!normalized) return input ?? "";
  const local = `0${normalized.slice(4)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}
