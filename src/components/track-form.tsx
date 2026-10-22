"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { Field, TextInput } from "@/components/fields";
import { Alert, Button } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import { saveTrackContact } from "@/lib/session-store";
import type { TrackingView } from "@/lib/tracking";
import { type TrackFormData, type TrackFormInput, trackSchema } from "@/lib/validation/track";

type Props =
  | { mode: "handoff" }
  | {
      mode: "inline";
      initialReference?: string;
      initialContact?: string;
      autoSubmit?: boolean;
      onResult: (view: TrackingView | null, values: TrackFormData) => void;
    };

/**
 * "handoff" (home page): checks the fields, then opens the track page.
 * "inline" (track page): looks the request up and hands back the result.
 */
export function TrackForm(props: Props) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const autoSubmitted = useRef(false);

  const initialReference = props.mode === "inline" ? (props.initialReference ?? "") : "";
  const initialContact = props.mode === "inline" ? (props.initialContact ?? "") : "";

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TrackFormInput, unknown, TrackFormData>({
    resolver: zodResolver(trackSchema),
    defaultValues: { reference: initialReference, contact: initialContact },
  });

  const onSubmit = async (values: TrackFormData) => {
    setFormError(null);

    if (props.mode === "handoff") {
      saveTrackContact(values.reference, values.contact);
      router.push(`/track?ref=${encodeURIComponent(values.reference)}`);
      return;
    }

    const result = await postJson<{ request: TrackingView }>("/api/track", values);
    if (result.ok) {
      props.onResult(result.data.request, values);
      return;
    }
    if (result.fieldErrors) {
      for (const [field, message] of Object.entries(result.fieldErrors)) {
        if (field === "reference" || field === "contact") setError(field, { message });
      }
    }
    if (result.status === 404) {
      props.onResult(null, values);
      return;
    }
    setFormError(result.error);
  };

  const submit = handleSubmit(onSubmit);

  // When arriving from the home page with both details, look it up straight away.
  const shouldAutoSubmit = props.mode === "inline" && props.autoSubmit;
  useEffect(() => {
    if (shouldAutoSubmit && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit();
    }
  }, [shouldAutoSubmit, submit]);

  const idPrefix = props.mode === "handoff" ? "home-track" : "track";

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {formError && (
        <Alert tone="error" live="assertive">
          {formError}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${idPrefix}-reference`} label="Reference number" hint="For example QT-1042" error={errors.reference?.message} required>
          {(a11y) => (
            <TextInput
              {...a11y}
              {...register("reference")}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="tabular uppercase"
            />
          )}
        </Field>
        <Field
          id={`${idPrefix}-contact`}
          label="Email or phone"
          hint="The one you gave on the form"
          error={errors.contact?.message}
          required
        >
          {(a11y) => <TextInput {...a11y} {...register("contact")} autoComplete="email" spellCheck={false} />}
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting} loadingText="Checking" className="w-full sm:w-auto">
        Track request
      </Button>
    </form>
  );
}
