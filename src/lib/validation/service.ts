import { z } from "zod";

import { ISSUE_TYPES, NIGERIAN_STATES, URGENCIES } from "@/lib/constants";

import { choice, contactShape, optionalLine, requiredLine, requiredText } from "./common";

export const serviceSchema = z.object({
  ...contactShape,
  equipment_or_site: requiredLine("the equipment or site", 2, 200),
  state: z
    .union([z.enum(NIGERIAN_STATES, { error: "Choose a state from the list" }), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v ? v : null)),
  town: optionalLine("town", 80),
  issue_type: choice(ISSUE_TYPES, "Choose what kind of help you need"),
  urgency: choice(URGENCIES, "Choose how urgent this is"),
  description: requiredText("a description of the problem", 10, 2000),
});

export type ServiceFormInput = z.input<typeof serviceSchema>;
export type ServiceFormData = z.output<typeof serviceSchema>;

export const SERVICE_DEFAULTS: ServiceFormInput = {
  full_name: "",
  company: "",
  email: "",
  phone: "",
  website: "",
  equipment_or_site: "",
  state: "",
  town: "",
  issue_type: "" as ServiceFormInput["issue_type"],
  urgency: "" as ServiceFormInput["urgency"],
  description: "",
};
