import { z } from "zod";

import { normalizeNgPhone } from "@/lib/phone";
import { normalizeReference } from "@/lib/reference";
import { cleanLine } from "@/lib/sanitize";

export const trackSchema = z.object({
  reference: z
    .string({ error: "Enter your reference number" })
    .transform((v) => cleanLine(v))
    .pipe(z.string().min(1, "Enter your reference number").max(20, "That reference is too long"))
    .transform((v, ctx) => {
      const normalized = normalizeReference(v);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: "References look like QT-1042 or SV-1042" });
        return z.NEVER;
      }
      return normalized;
    }),
  contact: z
    .string({ error: "Enter the email or phone number you used" })
    .transform((v) => cleanLine(v))
    .pipe(
      z
        .string()
        .min(1, "Enter the email or phone number you used")
        .max(254, "That is too long to be an email or phone number")
        .refine((v) => v.includes("@") || normalizeNgPhone(v) !== null, {
          error: "Enter the email address or Nigerian phone number you used on the form",
        }),
    ),
});

export type TrackFormInput = z.input<typeof trackSchema>;
export type TrackFormData = z.output<typeof trackSchema>;
