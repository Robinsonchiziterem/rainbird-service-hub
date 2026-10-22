import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

// Small, shared building blocks. Every interactive element has a visible
// focus ring (set in globals.css) and is at least 44px tall for thumbs.

type Variant = "primary" | "secondary" | "quiet" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-200 disabled:text-brand-800",
  secondary:
    "border border-brand-700 bg-white text-brand-700 hover:bg-brand-50 disabled:border-line disabled:text-muted",
  quiet: "text-brand-700 underline-offset-4 hover:underline disabled:text-muted",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-red-200",
};

export function buttonClasses(variant: Variant = "primary", extra = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  loading = false,
  loadingText,
  className = "",
  children,
  disabled,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; loading?: boolean; loadingText?: string }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, className)}
    >
      {loading && <Spinner />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={buttonClasses(variant, className)} />;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type Tone = "info" | "success" | "warning" | "error";

const TONES: Record<Tone, string> = {
  info: "border-brand-200 bg-brand-50 text-brand-900",
  success: "border-teal-500 bg-teal-50 text-teal-700",
  warning: "border-amber-400 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-900",
};

export function Alert({
  tone = "info",
  title,
  children,
  className = "",
  live,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  className?: string;
  /** "assertive" for errors that appear after an action, "polite" for updates. */
  live?: "polite" | "assertive";
}) {
  return (
    <div
      role={live === "assertive" ? "alert" : live === "polite" ? "status" : undefined}
      className={`rounded-md border-l-4 p-4 ${TONES[tone]} ${className}`}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1 text-sm leading-relaxed" : "text-sm leading-relaxed"}>{children}</div>}
    </div>
  );
}

export function PageHeading({ title, intro }: { title: string; intro?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold leading-tight tracking-tight text-brand-900 sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

/** A label/value list, used for summaries on the confirmation and staff pages. */
export function DetailList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map(([label, value]) => (
        <div key={label} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
          <dt className="text-sm font-medium text-muted">{label}</dt>
          <dd className="whitespace-pre-line break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
