import {
  ISSUE_TYPES,
  PRODUCT_AREAS,
  SITE_TYPES,
  TIMELINES,
  URGENCIES,
  WATER_NEEDS,
  WATER_SOURCES,
  labelFor,
} from "./constants";
import { formatNgPhone } from "./phone";
import type { QuoteFormData } from "./validation/quote";
import type { ServiceFormData } from "./validation/service";

// Label/value pairs used on the review step, the confirmation page and
// (for the staff side) the request detail page.

export function quoteSummary(d: QuoteFormData): [string, string][] {
  return [
    ["Name", d.full_name],
    ["Company", d.company ?? "Not provided"],
    ["Email", d.email],
    ["Phone", formatNgPhone(d.phone)],
    ["Site type", labelFor(SITE_TYPES, d.site_type)],
    ["Product area", labelFor(PRODUCT_AREAS, d.product_area)],
    ["Water source", labelFor(WATER_SOURCES, d.water_source)],
    ["Location", `${d.town}, ${d.state}`],
    ["Daily water need", labelFor(WATER_NEEDS, d.daily_water_need)],
    ["Timeline", labelFor(TIMELINES, d.preferred_timeline)],
    ["Notes", d.notes ?? "None"],
  ];
}

export function serviceSummary(d: ServiceFormData): [string, string][] {
  const location = [d.town, d.state].filter(Boolean).join(", ");
  return [
    ["Name", d.full_name],
    ["Company", d.company ?? "Not provided"],
    ["Email", d.email],
    ["Phone", formatNgPhone(d.phone)],
    ["Equipment or site", d.equipment_or_site],
    ["Location", location || "Not provided"],
    ["Help needed", labelFor(ISSUE_TYPES, d.issue_type)],
    ["Urgency", labelFor(URGENCIES, d.urgency)],
    ["Description", d.description],
  ];
}
