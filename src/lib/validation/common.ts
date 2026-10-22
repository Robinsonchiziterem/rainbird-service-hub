import { z } from "zod";

import type { Option } from "@/lib/constants";
import { normalizeNgPhone } from "@/lib/phone";
import { cleanLine, cleanMultiline } from "@/lib/sanitize";

// Building blocks shared by every form. The same schemas run in the browser
// (instant field errors) and on the server (the real gatekeeper).

/** Turns an options list into the tuple z.enum() needs. */
export function optionValues<T extends string>(options: Option<T>[]): [T, ...T[]] {
  return options.map((o) => o.value) as [T, ...T[]];
}

/** A pick-list field. An empty choice gets a friendly message. */
export function choice<T extends string>(options: Option<T>[], message: string) {
  return z.enum(optionValues(options), { error: message });
}

/** Required one-line text, cleaned. */
export function requiredLine(label: string, min: number, max: number) {
  return z
    .string({ error: `Enter ${label}` })
    .transform(cleanLine)
    .pipe(
      z
        .string()
        .min(1, `Enter ${label}`)
        .min(min, `${capitalise(label)} must be at least ${min} characters`)
        .max(max, `${capitalise(label)} must be ${max} characters or fewer`),
    );
}

/** Optional one-line text, cleaned. Empty becomes null. */
export function optionalLine(label: string, max: number) {
  return z
    .string()
    .optional()
    .nullable()
    .transform((v) => cleanLine(v ?? ""))
    .pipe(z.string().max(max, `${capitalise(label)} must be ${max} characters or fewer`))
    .transform((v) => (v === "" ? null : v));
}

/** Required paragraph text, cleaned. */
export function requiredText(label: string, min: number, max: number) {
  return z
    .string({ error: `Enter ${label}` })
    .transform(cleanMultiline)
    .pipe(
      z
        .string()
        .min(1, `Enter ${label}`)
        .min(min, `Please give a bit more detail (at least ${min} characters)`)
        .max(max, `${capitalise(label)} must be ${max} characters or fewer`),
    );
}

/** Optional paragraph text, cleaned. Empty becomes null. */
export function optionalText(label: string, max: number) {
  return z
    .string()
    .optional()
    .nullable()
    .transform((v) => cleanMultiline(v ?? ""))
    .pipe(z.string().max(max, `${capitalise(label)} must be ${max} characters or fewer`))
    .transform((v) => (v === "" ? null : v));
}

export const emailField = z
  .string({ error: "Enter your email address" })
  .transform((v) => cleanLine(v))
  .pipe(
    z
      .string()
      .min(1, "Enter your email address")
      .max(254, "Email address is too long")
      .pipe(z.email({ error: "Enter a valid email address, like name@company.com" })),
  );

export const phoneField = z
  .string({ error: "Enter your phone number" })
  .transform((v) => cleanLine(v))
  .pipe(
    z
      .string()
      .min(1, "Enter your phone number")
      .max(25, "Phone number is too long")
      .refine((v) => normalizeNgPhone(v) !== null, {
        error: "Enter a valid Nigerian number, like 0803 123 4567 or +234 803 123 4567",
      }),
  );

/** Hidden "website" field that people never see. Bots fill it in. */
export const honeypotField = z
  .string()
  .optional()
  .transform((v) => v ?? "")
  .refine((v) => v === "", { error: "Submission rejected" });

export const contactShape = {
  full_name: requiredLine("your full name", 2, 100),
  company: optionalLine("company name", 150),
  email: emailField,
  phone: phoneField,
  website: honeypotField,
};

function capitalise(label: string): string {
  const text = label.replace(/^your /, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Field-level errors in a plain { field: "message" } shape for the browser. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
