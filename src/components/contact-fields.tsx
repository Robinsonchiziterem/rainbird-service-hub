"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Field, HoneypotField, TextInput } from "@/components/fields";

type ContactValues = {
  full_name: string;
  company?: string | null;
  email: string;
  phone: string;
  website?: string;
};

// Name, company, email and phone: shared by the quote and service forms.
export function ContactFields<T extends ContactValues>({
  register,
  errors,
  idPrefix,
}: {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  idPrefix: string;
}) {
  // react-hook-form's generic types do not narrow well across shared
  // components, so we work with the known contact field names directly.
  const reg = register as unknown as UseFormRegister<ContactValues>;
  const err = errors as FieldErrors<ContactValues>;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field id={`${idPrefix}-full_name`} label="Full name" error={err.full_name?.message} required>
        {(a11y) => <TextInput {...a11y} {...reg("full_name")} autoComplete="name" />}
      </Field>
      <Field id={`${idPrefix}-company`} label="Company or organisation" error={err.company?.message} optional>
        {(a11y) => <TextInput {...a11y} {...reg("company")} autoComplete="organization" />}
      </Field>
      <Field id={`${idPrefix}-email`} label="Email address" error={err.email?.message} required>
        {(a11y) => (
          <TextInput {...a11y} {...reg("email")} type="email" inputMode="email" autoComplete="email" spellCheck={false} />
        )}
      </Field>
      <Field
        id={`${idPrefix}-phone`}
        label="Phone number"
        hint="Nigerian number, for example 0803 123 4567"
        error={err.phone?.message}
        required
      >
        {(a11y) => <TextInput {...a11y} {...reg("phone")} type="tel" inputMode="tel" autoComplete="tel" />}
      </Field>
      <HoneypotField register={reg("website")} />
    </div>
  );
}
