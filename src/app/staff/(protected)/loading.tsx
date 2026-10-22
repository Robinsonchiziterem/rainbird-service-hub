import { Spinner } from "@/components/ui";

export default function StaffLoading() {
  return (
    <div role="status" className="flex items-center gap-3 py-12 text-muted">
      <Spinner className="h-5 w-5" /> Loading requests
    </div>
  );
}
