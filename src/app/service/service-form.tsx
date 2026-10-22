"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { ContactFields } from "@/components/contact-fields";
import { ChoiceGroup, Field, SelectInput, TextArea, TextInput } from "@/components/fields";
import { PhotoPicker, type PreparedPhoto } from "@/components/photo-picker";
import { Alert, Button } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import { ISSUE_TYPES, NIGERIAN_STATES, PHOTO_RULES, URGENCIES } from "@/lib/constants";
import { saveConfirmation } from "@/lib/session-store";
import { serviceSummary } from "@/lib/summaries";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { extensionForMime } from "@/lib/validation/photos";
import {
  SERVICE_DEFAULTS,
  type ServiceFormData,
  type ServiceFormInput,
  serviceSchema,
} from "@/lib/validation/service";

/** Random file name. Works on plain http too (e.g. testing on a phone over Wi-Fi). */
function randomFileName() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Uploads photos straight to storage, then records them. Never throws. */
async function uploadPhotos(uploadId: string, photos: PreparedPhoto[], onProgress: (n: number) => void) {
  const paths: string[] = [];
  try {
    const storage = getBrowserSupabase().storage.from(PHOTO_RULES.bucket);
    for (const [index, photo] of photos.entries()) {
      onProgress(index + 1);
      const type = photo.blob.type || "image/jpeg";
      const path = `${uploadId}/${randomFileName()}.${extensionForMime(type)}`;
      const { error } = await storage.upload(path, photo.blob, { contentType: type, upsert: false });
      if (!error) paths.push(path);
    }
    if (paths.length === 0) return 0;
    const result = await postJson<{ saved: number }>("/api/requests/service/photos", { uploadId, paths });
    return result.ok ? result.data.saved : 0;
  } catch {
    return 0;
  }
}

export function ServiceForm() {
  const router = useRouter();
  const [photos, setPhotos] = useState<PreparedPhoto[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormInput, unknown, ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: SERVICE_DEFAULTS,
    mode: "onTouched",
  });

  const onSubmit = async (values: ServiceFormData) => {
    setFormError(null);
    setProgress("Sending your request");

    const result = await postJson<{ reference: string; uploadId: string }>("/api/requests/service", values);
    if (!result.ok) {
      setProgress(null);
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          if (field in SERVICE_DEFAULTS) setError(field as keyof ServiceFormInput, { message });
        }
      }
      setFormError(result.error);
      return;
    }

    const { reference, uploadId } = result.data;
    let saved = 0;
    if (photos.length > 0) {
      saved = await uploadPhotos(uploadId, photos, (n) =>
        setProgress(`Uploading photo ${n} of ${photos.length}`),
      );
    }

    saveConfirmation({
      reference,
      kind: "service",
      summary: serviceSummary(values),
      photosChosen: photos.length,
      photosSaved: saved,
    });
    setProgress("Done");
    router.push(`/confirmation?ref=${encodeURIComponent(reference)}`);
  };

  const busy = isSubmitting || progress !== null;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, () =>
        setFormError("Some answers need fixing. Check the highlighted fields."),
      )}
      noValidate
      className="space-y-8"
    >
      {formError && (
        <Alert tone="error" live="assertive">
          {formError}
        </Alert>
      )}

      <section aria-labelledby="svc-contact" className="rounded-lg border border-line bg-white p-5 sm:p-8">
        <h2 id="svc-contact" className="text-xl font-bold text-brand-900">
          Your contact details
        </h2>
        <div className="mt-6">
          <ContactFields register={register} errors={errors} idPrefix="service" />
        </div>
      </section>

      <section aria-labelledby="svc-problem" className="space-y-6 rounded-lg border border-line bg-white p-5 sm:p-8">
        <h2 id="svc-problem" className="text-xl font-bold text-brand-900">
          The equipment and the problem
        </h2>

        <ChoiceGroup
          name="urgency"
          legend="How urgent is it?"
          options={URGENCIES}
          register={register("urgency")}
          error={errors.urgency?.message}
          columns={2}
        />

        <ChoiceGroup
          name="issue_type"
          legend="What do you need?"
          options={ISSUE_TYPES}
          register={register("issue_type")}
          error={errors.issue_type?.message}
          columns={2}
        />

        <Field
          id="service-equipment_or_site"
          label="Which equipment or site?"
          hint="For example: borehole pump at Lekki estate, or fire pump room at our Kano factory"
          error={errors.equipment_or_site?.message}
          required
        >
          {(a11y) => <TextInput {...a11y} {...register("equipment_or_site")} />}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="service-state" label="State" error={errors.state?.message} optional>
            {(a11y) => (
              <SelectInput {...a11y} {...register("state")} options={NIGERIAN_STATES} placeholder="Choose a state" />
            )}
          </Field>
          <Field id="service-town" label="Town or area" error={errors.town?.message} optional>
            {(a11y) => <TextInput {...a11y} {...register("town")} autoComplete="address-level2" />}
          </Field>
        </div>

        <Field
          id="service-description"
          label="Describe the problem"
          hint="What happened, when it started, any error lights or sounds, and what you have tried."
          error={errors.description?.message}
          required
        >
          {(a11y) => <TextArea {...a11y} {...register("description")} rows={6} maxLength={2000} />}
        </Field>

        <PhotoPicker photos={photos} onChange={setPhotos} disabled={busy} />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="submit" loading={busy} loadingText={progress ?? "Sending request"} className="w-full sm:w-auto">
          Send service request
        </Button>
        <p className="text-sm text-muted" aria-live="polite">
          {busy && progress ? `${progress}…` : "You will get a reference number on the next screen."}
        </p>
      </div>
    </form>
  );
}
