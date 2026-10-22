"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Field, SelectInput, TextArea } from "@/components/fields";
import { Alert, Button } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import { STATUSES, labelFor } from "@/lib/constants";
import type { RequestStatus } from "@/lib/database.types";
import { type StaffUpdateData, type StaffUpdateInput, staffUpdateSchema } from "@/lib/validation/staff";

export function UpdatePanel({
  requestId,
  currentStatus,
  currentEngineerId,
  engineers,
}: {
  requestId: string;
  currentStatus: RequestStatus;
  currentEngineerId: string | null;
  engineers: { id: string; full_name: string; specialty: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StaffUpdateInput, unknown, StaffUpdateData>({
    resolver: zodResolver(staffUpdateSchema),
    defaultValues: {
      status: currentStatus,
      engineer: currentEngineerId ?? "unassigned",
      public_note: "",
      internal_note: "",
    },
  });

  const chosenStatus = watch("status");
  const chosenEngineer = watch("engineer");
  const willAutoAssign =
    currentStatus === "received" &&
    chosenStatus === "received" &&
    chosenEngineer !== "unassigned" &&
    chosenEngineer !== (currentEngineerId ?? "unassigned");

  const onSubmit = async (values: StaffUpdateData) => {
    setMessage(null);
    const result = await postJson<{ status: RequestStatus }>(`/api/staff/requests/${requestId}`, values);
    if (!result.ok) {
      if (result.status === 401) {
        router.replace(`/staff/login?next=/staff/requests/${requestId}`);
        return;
      }
      for (const [field, text] of Object.entries(result.fieldErrors ?? {})) {
        if (["status", "engineer", "public_note", "internal_note"].includes(field)) {
          setError(field as keyof StaffUpdateInput, { message: text });
        }
      }
      setMessage({ tone: "error", text: result.error });
      return;
    }

    const newStatus = result.data.status;
    const parts = ["Saved."];
    if (newStatus !== currentStatus) parts.push(`Status is now ${labelFor(STATUSES, newStatus)}, and the customer's tracker shows it.`);
    if (values.public_note) parts.push("The customer can see your public note.");
    setMessage({ tone: "success", text: parts.join(" ") });
    reset({ status: newStatus, engineer: values.engineer || "unassigned", public_note: "", internal_note: "" });
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <h2 className="text-lg font-bold text-brand-900">Update this request</h2>

      {message && (
        <Alert tone={message.tone} live={message.tone === "error" ? "assertive" : "polite"}>
          {message.text}
        </Alert>
      )}

      <Field id="u-status" label="Status" error={errors.status?.message}>
        {(a11y) => <SelectInput {...a11y} {...register("status")} options={STATUSES} placeholder="Choose a status" />}
      </Field>

      <Field
        id="u-engineer"
        label="Engineer"
        hint={willAutoAssign ? "Saving will also move the status to Assigned." : undefined}
        error={errors.engineer?.message}
      >
        {(a11y) => (
          <select {...a11y} {...register("engineer")} className="block min-h-11 w-full rounded-md border border-slate-400 bg-white px-3 py-2.5">
            <option value="unassigned">Unassigned</option>
            {engineers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.specialty})
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id="u-public"
        label="Public note"
        hint="The customer sees this on their tracker, and it is added to the simulated message."
        error={errors.public_note?.message}
        optional
      >
        {(a11y) => <TextArea {...a11y} {...register("public_note")} rows={3} maxLength={2000} />}
      </Field>

      <Field
        id="u-internal"
        label="Internal note"
        hint="Staff only. Never shown to the customer."
        error={errors.internal_note?.message}
        optional
      >
        {(a11y) => <TextArea {...a11y} {...register("internal_note")} rows={3} maxLength={2000} className="bg-amber-50/40" />}
      </Field>

      <Button type="submit" loading={isSubmitting} loadingText="Saving" disabled={!isDirty} className="w-full">
        Save update
      </Button>
      {!isDirty && <p className="text-center text-xs text-muted">Change something above to save.</p>}
    </form>
  );
}
