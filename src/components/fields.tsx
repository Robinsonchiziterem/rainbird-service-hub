import type { ComponentProps, ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

import type { Option } from "@/lib/constants";

// Form fields with proper labels, hints and error messages that screen
// readers announce (aria-describedby + aria-invalid).

export const controlClasses =
  "block w-full min-h-11 rounded-md border bg-white px-3 py-2.5 text-base text-ink placeholder:text-slate-500 " +
  "border-slate-400 hover:border-brand-500 aria-[invalid=true]:border-red-700 aria-[invalid=true]:bg-red-50/40 " +
  "disabled:bg-surface disabled:text-muted";

type A11y = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

export function Field({
  id,
  label,
  hint,
  error,
  required,
  optional,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: (a11y: A11y) => ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block font-semibold text-ink">
        {label}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error ? true : undefined,
          "aria-required": required || undefined,
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-800">
      <span aria-hidden="true" className="mt-px font-bold">
        !
      </span>
      {message}
    </p>
  );
}

export function TextInput(props: ComponentProps<"input">) {
  return <input {...props} className={`${controlClasses} ${props.className ?? ""}`} />;
}

export function TextArea(props: ComponentProps<"textarea">) {
  return <textarea rows={5} {...props} className={`${controlClasses} leading-relaxed ${props.className ?? ""}`} />;
}

export function SelectInput({
  options,
  placeholder = "Choose one",
  ...props
}: ComponentProps<"select"> & { options: readonly (Option<string> | string)[]; placeholder?: string }) {
  return (
    <select {...props} className={`${controlClasses} pr-8 ${props.className ?? ""}`}>
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const value = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

/**
 * A group of large tap-friendly radio choices, inside a fieldset with a
 * legend so screen readers read the question with every option.
 */
export function ChoiceGroup<T extends string>({
  name,
  legend,
  hint,
  options,
  register,
  error,
  columns = 2,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: Option<T>[];
  register: UseFormRegisterReturn;
  error?: string;
  columns?: 1 | 2 | 3;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const cols = columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "";

  return (
    <fieldset aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}>
      <legend className="font-semibold text-ink">{legend}</legend>
      {hint && (
        <p id={hintId} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className={`mt-2 grid gap-2 ${cols}`}>
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-md border bg-white px-3 py-3 transition-colors hover:border-brand-500 has-[:checked]:border-brand-700 has-[:checked]:bg-brand-50 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-500 ${
                error ? "border-red-700" : "border-slate-400"
              }`}
            >
              <input
                id={id}
                type="radio"
                value={option.value}
                {...register}
                aria-invalid={error ? true : undefined}
                className="mt-1 h-4 w-4 shrink-0 accent-brand-700 focus-visible:outline-none"
              />
              <span>
                <span className="block font-medium leading-snug">{option.label}</span>
                {option.hint && <span className="block text-sm text-muted">{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

/** Hidden trap field. Real people never see or fill it; many bots do. */
export function HoneypotField({ register }: { register: UseFormRegisterReturn }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Leave this empty
        <input type="text" tabIndex={-1} autoComplete="off" {...register} />
      </label>
    </div>
  );
}
