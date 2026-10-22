import { z } from "zod";

import {
  NIGERIAN_STATES,
  PRODUCT_AREAS,
  SITE_TYPES,
  TIMELINES,
  WATER_NEEDS,
  WATER_SOURCES,
} from "@/lib/constants";

import { choice, contactShape, optionalText, requiredLine } from "./common";

export const quoteSchema = z.object({
  ...contactShape,
  site_type: choice(SITE_TYPES, "Choose the type of site"),
  product_area: choice(PRODUCT_AREAS, "Choose what you need, or pick “Not sure yet”"),
  water_source: choice(WATER_SOURCES, "Choose your water source"),
  state: z.enum(NIGERIAN_STATES, { error: "Choose your state" }),
  town: requiredLine("your town or area", 2, 80),
  daily_water_need: choice(WATER_NEEDS, "Choose roughly how much water you need, or “Not sure”"),
  preferred_timeline: choice(TIMELINES, "Choose when you need this"),
  notes: optionalText("notes", 2000),
});

export type QuoteFormInput = z.input<typeof quoteSchema>;
export type QuoteFormData = z.output<typeof quoteSchema>;

// The multi-step form checks one group of fields at a time.
export const QUOTE_STEPS = [
  {
    title: "Your contact details",
    fields: ["full_name", "company", "email", "phone"],
  },
  {
    title: "Your site and what you need",
    fields: ["site_type", "product_area", "water_source"],
  },
  {
    title: "Location and timing",
    fields: ["state", "town", "daily_water_need", "preferred_timeline", "notes"],
  },
  {
    title: "Check and send",
    fields: [],
  },
] as const satisfies readonly { title: string; fields: readonly (keyof QuoteFormInput)[] }[];

export const QUOTE_DEFAULTS: QuoteFormInput = {
  full_name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  // Pick-lists start empty so nothing is chosen for the customer.
  site_type: "" as QuoteFormInput["site_type"],
  product_area: "" as QuoteFormInput["product_area"],
  water_source: "" as QuoteFormInput["water_source"],
  state: "" as QuoteFormInput["state"],
  town: "",
  daily_water_need: "" as QuoteFormInput["daily_water_need"],
  preferred_timeline: "" as QuoteFormInput["preferred_timeline"],
  notes: "",
};
