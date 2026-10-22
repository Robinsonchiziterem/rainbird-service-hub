"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { ContactFields } from "@/components/contact-fields";
import { ChoiceGroup, Field, SelectInput, TextArea, TextInput } from "@/components/fields";
import { StepProgress } from "@/components/step-progress";
import { Alert, Button, DetailList } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import {
  NIGERIAN_STATES,
  PRODUCT_AREAS,
  SITE_TYPES,
  TIMELINES,
  WATER_NEEDS,
  WATER_SOURCES,
} from "@/lib/constants";
import { saveConfirmation } from "@/lib/session-store";
import { quoteSummary } from "@/lib/summaries";
import {
  QUOTE_DEFAULTS,
  QUOTE_STEPS,
  type QuoteFormData,
  type QuoteFormInput,
  quoteSchema,
} from "@/lib/validation/quote";

const STEP_TITLES = QUOTE_STEPS.map((s) => s.title);
const LAST_STEP = QUOTE_STEPS.length - 1;

export function QuoteForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormInput, unknown, QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: QUOTE_DEFAULTS,
    mode: "onTouched",
    shouldUnregister: false,
  });

  // Move keyboard and screen-reader focus to the new step's heading.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  // Warn before leaving with a half-filled form.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!submitted && JSON.stringify(getValues()) !== JSON.stringify(QUOTE_DEFAULTS)) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [getValues, submitted]);

  const goNext = async () => {
    const fields = QUOTE_STEPS[step]?.fields ?? [];
    const valid = await trigger([...fields] as (keyof QuoteFormInput)[], { shouldFocus: true });
    if (valid) setStep((s) => Math.min(s + 1, LAST_STEP));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = async (values: QuoteFormData) => {
    setFormError(null);
    const result = await postJson<{ reference: string }>("/api/requests/quote", values);

    if (!result.ok) {
      if (result.fieldErrors) {
        let firstStep = LAST_STEP;
        for (const [field, message] of Object.entries(result.fieldErrors)) {
          const owner = QUOTE_STEPS.findIndex((s) => (s.fields as readonly string[]).includes(field));
          if (owner >= 0) {
            setError(field as keyof QuoteFormInput, { message });
            firstStep = Math.min(firstStep, owner);
          }
        }
        setStep(firstStep);
      }
      setFormError(result.error);
      return;
    }

    setSubmitted(true);
    saveConfirmation({ reference: result.data.reference, kind: "quote", summary: quoteSummary(values) });
    router.push(`/confirmation?ref=${encodeURIComponent(result.data.reference)}`);
  };

  // If validation fails on the last step (e.g. a field was cleared), jump to it.
  const onInvalid = (fieldErrors: typeof errors) => {
    const first = QUOTE_STEPS.findIndex((s) =>
      (s.fields as readonly string[]).some((f) => f in fieldErrors),
    );
    if (first >= 0) setStep(first);
    setFormError("Some answers need fixing. Check the highlighted fields.");
  };

  const review = step === LAST_STEP ? quoteSchema.safeParse(getValues()) : null;

  return (
    <div className="space-y-6">
      <StepProgress steps={STEP_TITLES} current={step} />

      <form
        onSubmit={(event) => {
          // Only the review step may send the request.
          if (step < LAST_STEP) {
            event.preventDefault();
            void goNext();
            return;
          }
          void handleSubmit(onSubmit, onInvalid)(event);
        }}
        onKeyDown={(event) => {
          // Pressing Enter in a text box moves to the next step instead of
          // submitting the whole form early.
          const target = event.target as HTMLElement;
          if (event.key === "Enter" && step < LAST_STEP && target.tagName === "INPUT") {
            event.preventDefault();
            void goNext();
          }
        }}
        noValidate
        className="rounded-lg border border-line bg-white p-5 sm:p-8"
      >
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-brand-900 outline-none">
          {STEP_TITLES[step]}
        </h2>

        {formError && (
          <Alert tone="error" live="assertive" className="mt-4">
            {formError}
          </Alert>
        )}

        <div className="mt-6 space-y-6">
          {step === 0 && <ContactFields register={register} errors={errors} idPrefix="quote" />}

          {step === 1 && (
            <>
              <ChoiceGroup
                name="site_type"
                legend="What kind of site is this for?"
                options={SITE_TYPES}
                register={register("site_type")}
                error={errors.site_type?.message}
                columns={2}
              />
              <ChoiceGroup
                name="product_area"
                legend="What do you need?"
                hint="Pick the closest match. Our engineers will advise on the details."
                options={PRODUCT_AREAS}
                register={register("product_area")}
                error={errors.product_area?.message}
                columns={2}
              />
              <ChoiceGroup
                name="water_source"
                legend="Where does the water come from?"
                options={WATER_SOURCES}
                register={register("water_source")}
                error={errors.water_source?.message}
                columns={3}
              />
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="quote-state" label="State" error={errors.state?.message} required>
                  {(a11y) => (
                    <SelectInput {...a11y} {...register("state")} options={NIGERIAN_STATES} placeholder="Choose a state" />
                  )}
                </Field>
                <Field id="quote-town" label="Town or area" hint="For example Ikeja, Epe or Wuse II" error={errors.town?.message} required>
                  {(a11y) => <TextInput {...a11y} {...register("town")} autoComplete="address-level2" />}
                </Field>
              </div>
              <Field
                id="quote-daily_water_need"
                label="Roughly how much water do you need each day?"
                hint="A rough idea helps us size the pump. Choose “Not sure” if you do not know."
                error={errors.daily_water_need?.message}
                required
              >
                {(a11y) => <SelectInput {...a11y} {...register("daily_water_need")} options={WATER_NEEDS} />}
              </Field>
              <Field id="quote-preferred_timeline" label="When do you need this?" error={errors.preferred_timeline?.message} required>
                {(a11y) => <SelectInput {...a11y} {...register("preferred_timeline")} options={TIMELINES} />}
              </Field>
              <Field
                id="quote-notes"
                label="Anything else we should know?"
                hint="For example borehole depth, building height, or the equipment you have now."
                error={errors.notes?.message}
                optional
              >
                {(a11y) => <TextArea {...a11y} {...register("notes")} maxLength={2000} />}
              </Field>
            </>
          )}

          {step === LAST_STEP && (
            <div>
              <p className="text-muted">Check your answers. Use “Back” to change anything.</p>
              {review?.success ? (
                <div className="mt-4">
                  <DetailList items={quoteSummary(review.data)} />
                </div>
              ) : (
                <Alert tone="warning" className="mt-4">
                  Some answers are missing. Go back and complete the earlier steps.
                </Alert>
              )}
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-between">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={goBack} disabled={isSubmitting}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {/* Different keys stop React reusing the same button element, so a
              click on "Continue" can never turn into a submit mid-click. */}
          {step < LAST_STEP ? (
            <Button key="continue" type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button key="submit" type="submit" loading={isSubmitting} loadingText="Sending request">
              Send quote request
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
