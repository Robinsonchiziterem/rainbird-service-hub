import { formatDateTime } from "@/lib/format";
import type { TimelineStage } from "@/lib/tracking";

// The status timeline, drawn as a pipe. Water fills each section of pipe up to
// the current stage. Stacked vertically on phones, horizontal on wider screens.

export function PipeTracker({ stages }: { stages: TimelineStage[] }) {
  // Index of the furthest stage reached (written out for older phone browsers).
  const currentIndex = stages.reduce((acc, s, i) => (s.state !== "upcoming" ? i : acc), 0);

  return (
    <ol className="grid gap-6 sm:grid-cols-4 sm:gap-2" aria-label="Request progress">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1;
        const pipeFilled = index < currentIndex;
        const stateText =
          stage.state === "complete" ? "completed" : stage.state === "current" ? "current stage" : "not reached yet";

        return (
          <li
            key={stage.status}
            aria-current={stage.state === "current" ? "step" : undefined}
            className="relative flex gap-4 sm:flex-col sm:items-center sm:gap-3 sm:text-center"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-[21px] top-12 -bottom-6 w-1.5 overflow-hidden rounded-full bg-slate-200 sm:left-[calc(50%+26px)] sm:right-[calc(-50%+26px)] sm:top-[21px] sm:bottom-auto sm:h-1.5 sm:w-auto"
              >
                {pipeFilled && (
                  <span
                    className="pipe-water block h-full w-full bg-gradient-to-b from-brand-500 to-teal-500 sm:bg-gradient-to-r"
                    style={{ animationDelay: `${index * 280}ms` }}
                  />
                )}
              </span>
            )}

            <span
              aria-hidden="true"
              className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] ${
                stage.state === "complete"
                  ? "border-teal-600 bg-teal-600 text-white"
                  : stage.state === "current"
                    ? "border-brand-700 bg-white"
                    : "border-slate-300 bg-white"
              }`}
            >
              {stage.state === "complete" ? (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : stage.state === "current" ? (
                <span className="pipe-drop h-4 w-4 rounded-full bg-brand-700" />
              ) : null}
            </span>

            <div className="min-w-0 pt-1 sm:pt-0">
              <p
                className={`font-semibold ${stage.state === "upcoming" ? "text-muted" : "text-ink"}`}
              >
                {stage.label}
                <span className="sr-only">, {stateText}</span>
              </p>
              <p className="mt-0.5 text-sm text-muted">
                {stage.at ? formatDateTime(stage.at) : stage.state === "upcoming" ? stage.hint : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
