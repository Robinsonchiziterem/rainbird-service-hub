"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PipeTracker } from "@/components/pipe-tracker";
import { TrackForm } from "@/components/track-form";
import { Alert, Button } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { normalizeReference } from "@/lib/reference";
import { clearTrackContact, peekTrackContact } from "@/lib/session-store";
import { TRACK_NOT_FOUND_MESSAGE, type TrackingView } from "@/lib/tracking";
import type { TrackFormData } from "@/lib/validation/track";

type State =
  | { kind: "idle" }
  | { kind: "not-found" }
  | { kind: "found"; view: TrackingView; lookup: TrackFormData; checkedAt: Date };

export function TrackClient() {
  const searchParams = useSearchParams();
  const initialReference = normalizeReference(searchParams.get("ref")) ?? "";

  // Read the hand-off from the home page once, on first render in the browser.
  const [prefill, setPrefill] = useState(() => ({
    reference: initialReference,
    contact: typeof window !== "undefined" && initialReference ? (peekTrackContact(initialReference) ?? "") : "",
  }));

  // The email/phone is only needed once; remove it from the tab's storage.
  useEffect(() => {
    clearTrackContact();
  }, []);

  const [state, setState] = useState<State>({ kind: "idle" });
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.kind !== "idle") resultRef.current?.focus();
  }, [state.kind]);

  const handleResult = (view: TrackingView | null, lookup: TrackFormData) => {
    setRefreshError(null);
    setState(view ? { kind: "found", view, lookup, checkedAt: new Date() } : { kind: "not-found" });
  };

  const refresh = async () => {
    if (state.kind !== "found") return;
    setRefreshing(true);
    setRefreshError(null);
    const result = await postJson<{ request: TrackingView }>("/api/track", state.lookup);
    setRefreshing(false);
    if (result.ok) {
      setState({ ...state, view: result.data.request, checkedAt: new Date() });
    } else {
      setRefreshError(result.error);
    }
  };

  return (
    <div className="space-y-8">
      {state.kind !== "found" && (
        <div className="max-w-2xl rounded-lg border border-line bg-white p-5 sm:p-6">
          <TrackForm
            mode="inline"
            initialReference={prefill.reference}
            initialContact={prefill.contact}
            autoSubmit={Boolean(prefill.reference && prefill.contact)}
            onResult={handleResult}
          />
        </div>
      )}

      <div ref={resultRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {state.kind === "not-found" && (
          <Alert tone="warning" title="No matching request">
            {TRACK_NOT_FOUND_MESSAGE}
          </Alert>
        )}

        {state.kind === "found" && (
          <TrackResult
            view={state.view}
            checkedAt={state.checkedAt}
            refreshing={refreshing}
            refreshError={refreshError}
            onRefresh={refresh}
            onReset={() => {
              // Start again with an empty form (no automatic lookup).
              setPrefill({ reference: "", contact: "" });
              setState({ kind: "idle" });
            }}
          />
        )}
      </div>
    </div>
  );
}

function TrackResult({
  view,
  checkedAt,
  refreshing,
  refreshError,
  onRefresh,
  onReset,
}: {
  view: TrackingView;
  checkedAt: Date;
  refreshing: boolean;
  refreshError: string | null;
  onRefresh: () => void;
  onReset: () => void;
}) {
  return (
    <section aria-labelledby="result-heading" className="space-y-6">
      <div className="rounded-lg border border-line bg-white p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{view.typeLabel}</p>
            <h2 id="result-heading" className="text-3xl font-bold tracking-tight text-brand-900">
              {view.reference}
            </h2>
            <p className="mt-1 text-muted">
              {view.summary}. Sent {formatDateTime(view.submittedAt)}.
            </p>
          </div>
          <p className="rounded-md bg-brand-50 px-3 py-2 text-sm">
            Status: <strong className="text-brand-900">{view.statusLabel}</strong>
          </p>
        </div>

        <div className="mt-8">
          <PipeTracker stages={view.stages} />
        </div>

        {view.engineerFirstName && view.status !== "done" && (
          <p className="mt-8 border-l-4 border-teal-600 pl-4 leading-relaxed">
            Your engineer is <strong>{view.engineerFirstName}</strong>. They will contact you using the details you
            gave.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white p-5 sm:p-8">
        <h3 className="text-lg font-bold text-brand-900">Updates from our team</h3>
        {view.publicNotes.length === 0 ? (
          <p className="mt-2 text-muted">No updates yet. When our team adds a note, it will appear here.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {view.publicNotes.map((note, i) => (
              <li key={`${note.at}-${i}`} className="border-l-4 border-brand-200 pl-4">
                <p className="text-sm text-muted">{formatDateTime(note.at)}</p>
                <p className="mt-1 whitespace-pre-line break-words">{note.body}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {refreshError && (
        <Alert tone="error" live="assertive">
          {refreshError}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onRefresh} loading={refreshing} loadingText="Checking">
          Check for updates
        </Button>
        <Button variant="secondary" onClick={onReset}>
          Track another request
        </Button>
        <p className="text-sm text-muted" aria-live="polite">
          Last checked {formatDateTime(checkedAt)}
        </p>
      </div>
    </section>
  );
}
