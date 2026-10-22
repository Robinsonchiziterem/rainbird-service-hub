import { z } from "zod";

import { REQUEST_TYPES, STATUSES, URGENCIES } from "@/lib/constants";
import { cleanSearch } from "@/lib/sanitize";

import { optionValues, optionalText } from "./common";

const uuid = z.uuid({ error: "Invalid ID" });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address")
    .pipe(z.email({ error: "Enter a valid email address" })),
  password: z.string().min(1, "Enter your password").max(200, "Password is too long"),
});
export type LoginInput = z.input<typeof loginSchema>;

// engineer: "" = leave as is, "unassigned" = remove the engineer, or an engineer ID.
export const staffUpdateSchema = z
  .object({
    status: z.enum(optionValues(STATUSES), { error: "Choose a status" }),
    engineer: z.union([z.literal(""), z.literal("unassigned"), uuid]),
    public_note: optionalText("public note", 2000),
    internal_note: optionalText("internal note", 2000),
  })
  .strict();
export type StaffUpdateInput = z.input<typeof staffUpdateSchema>;
export type StaffUpdateData = z.output<typeof staffUpdateSchema>;

// Dashboard filters come from the page address (?type=service&status=...).
// Anything unexpected is quietly ignored rather than crashing the page.
const optionalEnum = <T extends string>(values: [T, ...T[]]) =>
  z.enum(values).optional().catch(undefined);

export const dashboardFilterSchema = z.object({
  type: optionalEnum(optionValues(REQUEST_TYPES)),
  status: z
    .union([z.enum(optionValues(STATUSES)), z.literal("open")])
    .optional()
    .catch(undefined),
  urgency: optionalEnum(optionValues(URGENCIES)),
  engineer: z.union([uuid, z.literal("unassigned")]).optional().catch(undefined),
  q: z
    .string()
    .optional()
    .catch(undefined)
    .transform((v) => cleanSearch(v ?? "") || undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined).transform((v) => v ?? 1),
});
export type DashboardFilters = z.output<typeof dashboardFilterSchema>;

/** Reads one value from Next.js searchParams (which may be a string or array). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDashboardFilters(params: Record<string, string | string[] | undefined>): DashboardFilters {
  return dashboardFilterSchema.parse({
    type: firstParam(params.type),
    status: firstParam(params.status),
    urgency: firstParam(params.urgency),
    engineer: firstParam(params.engineer),
    q: firstParam(params.q),
    page: firstParam(params.page),
  });
}

/** Only allow redirects back into the staff area after login. */
export function safeStaffPath(next: string | null | undefined): string {
  if (!next || typeof next !== "string") return "/staff";
  if (!next.startsWith("/staff") || next.startsWith("//") || next.includes("\\")) return "/staff";
  if (next.startsWith("/staff/login")) return "/staff";
  return next;
}
