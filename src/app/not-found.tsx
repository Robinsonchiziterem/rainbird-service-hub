import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-3xl font-bold text-brand-900">Page not found</h1>
      <p className="leading-relaxed text-muted">
        The page you asked for does not exist. If you followed a link to a request, try tracking it with your
        reference number instead.
      </p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/">Go to home page</ButtonLink>
        <ButtonLink href="/track" variant="secondary">
          Track a request
        </ButtonLink>
      </div>
    </div>
  );
}
