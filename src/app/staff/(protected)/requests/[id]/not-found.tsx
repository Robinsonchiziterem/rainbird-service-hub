import { ButtonLink } from "@/components/ui";

export default function RequestNotFound() {
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-brand-900">Request not found</h1>
      <p className="text-muted">This request does not exist, or the link is wrong.</p>
      <ButtonLink href="/staff">All requests</ButtonLink>
    </div>
  );
}
