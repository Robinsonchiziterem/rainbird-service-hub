// Human-friendly labels for every database option, in display order.
// Forms, the tracker and the staff dashboard all read from here, so a label
// only ever needs changing in one place.

import type {
  IssueType,
  ProductArea,
  QuoteTimeline,
  RequestStatus,
  RequestType,
  RequestUrgency,
  SiteType,
  WaterNeedBand,
  WaterSource,
} from "./database.types";

export type Option<T extends string> = { value: T; label: string; hint?: string };

export const REQUEST_TYPES: Option<RequestType>[] = [
  { value: "quote", label: "Quote" },
  { value: "service", label: "Service" },
];

// Order matters: this is the customer-facing timeline.
export const STATUSES: Option<RequestStatus>[] = [
  { value: "received", label: "Received", hint: "We have your request." },
  { value: "assigned", label: "Assigned", hint: "An engineer is handling it." },
  { value: "scheduled", label: "Scheduled", hint: "A visit or delivery is booked." },
  { value: "done", label: "Done", hint: "The work is complete." },
];

// Order matters: this is the dashboard priority order.
export const URGENCIES: Option<RequestUrgency>[] = [
  { value: "critical", label: "Critical", hint: "System down or safety risk" },
  { value: "high", label: "High", hint: "Badly affecting operations" },
  { value: "normal", label: "Normal", hint: "Needs attention soon" },
  { value: "low", label: "Low", hint: "Whenever convenient" },
];

export const SITE_TYPES: Option<SiteType>[] = [
  { value: "farm", label: "Farm" },
  { value: "factory", label: "Factory" },
  { value: "hotel_real_estate", label: "Hotel or real estate" },
  { value: "construction", label: "Construction" },
  { value: "government", label: "Government" },
  { value: "oil_gas", label: "Oil and gas" },
  { value: "other", label: "Other" },
];

export const PRODUCT_AREAS: Option<ProductArea>[] = [
  { value: "submersible_pumps", label: "Submersible pumps" },
  { value: "centrifugal_pumps", label: "Centrifugal pumps" },
  { value: "chemical_dosing", label: "Chemical dosing" },
  { value: "firefighting_systems", label: "Firefighting systems" },
  { value: "water_treatment", label: "Water treatment" },
  { value: "pressure_booster", label: "Pressure booster" },
  { value: "solar_pumps", label: "Solar pumps" },
  { value: "sanitary_pumps", label: "Sanitary pumps" },
  { value: "not_sure", label: "Not sure yet" },
];

export const WATER_SOURCES: Option<WaterSource>[] = [
  { value: "borehole", label: "Borehole" },
  { value: "river_well", label: "River or well" },
  { value: "municipal", label: "Municipal supply" },
  { value: "tank", label: "Storage tank" },
  { value: "other", label: "Other" },
];

export const WATER_NEEDS: Option<WaterNeedBand>[] = [
  { value: "under_5k", label: "Under 5,000 litres a day" },
  { value: "from_5k_to_20k", label: "5,000 to 20,000 litres a day" },
  { value: "from_20k_to_100k", label: "20,000 to 100,000 litres a day" },
  { value: "over_100k", label: "Over 100,000 litres a day" },
  { value: "not_sure", label: "Not sure" },
];

export const TIMELINES: Option<QuoteTimeline>[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_1_month", label: "Within 1 month" },
  { value: "one_to_3_months", label: "1 to 3 months" },
  { value: "over_3_months", label: "More than 3 months" },
  { value: "just_exploring", label: "Just exploring options" },
];

export const ISSUE_TYPES: Option<IssueType>[] = [
  { value: "emergency_repair", label: "Emergency repair" },
  { value: "scheduled_maintenance", label: "Scheduled maintenance" },
  { value: "spare_parts", label: "Spare parts" },
  { value: "technical_advice", label: "Technical advice" },
];

// The 36 states plus the FCT.
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

// Photo upload rules (the database and storage bucket enforce the same limits).
export const PHOTO_RULES = {
  maxFiles: 3,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
  bucket: "request-photos",
} as const;

// Look up a label for any option value, falling back to the raw value.
export function labelFor<T extends string>(options: Option<T>[], value: T | null | undefined): string {
  if (!value) return "Not provided";
  return options.find((o) => o.value === value)?.label ?? value;
}

export const FOOTER_NOTE =
  "Concept prototype built for the Blueprint hackathon. Not an official Rain Bird Nigeria system. Demo data only.";
