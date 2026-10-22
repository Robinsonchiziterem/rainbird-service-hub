// Progress indicator for the multi-step quote form. On phones it shows a
// compact bar plus "Step 2 of 4"; on wider screens, every step's name.

export function StepProgress({ steps, current }: { steps: readonly string[]; current: number }) {
  const percent = ((current + 1) / steps.length) * 100;

  return (
    <nav aria-label="Form progress">
      <p className="text-sm font-medium text-muted sm:hidden">
        Step {current + 1} of {steps.length}: <span className="text-ink">{steps[current]}</span>
      </p>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 sm:hidden"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={current + 1}
        aria-label={`Step ${current + 1} of ${steps.length}`}
      >
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-500 transition-[width]" style={{ width: `${percent}%` }} />
      </div>

      <ol className="hidden grid-cols-4 gap-2 sm:grid">
        {steps.map((title, index) => {
          const state = index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li
              key={title}
              aria-current={state === "current" ? "step" : undefined}
              className={`border-t-4 pt-2 text-sm ${
                state === "done"
                  ? "border-teal-600 text-teal-700"
                  : state === "current"
                    ? "border-brand-700 font-semibold text-brand-900"
                    : "border-slate-200 text-muted"
              }`}
            >
              <span className="tabular">{index + 1}.</span> {title}
              {state === "done" && <span className="sr-only"> (completed)</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
