type WorkflowPhaseStepperProps = {
  phase: string;
  skippedDiscover?: boolean;
};

const STEPS = [
  { id: "discover", label: "Discover" },
  { id: "shortlist", label: "Shortlist" },
  { id: "research", label: "Research" },
  { id: "decide", label: "Decide" },
  { id: "approve", label: "Approve" },
  { id: "trade", label: "Trade" },
] as const;

function mapPhaseToStepIndex(phase: string): number {
  switch (phase) {
    case "SPEC":
    case "DISCOVER":
      return 0;
    case "SHORTLIST":
      return 1;
    case "RESEARCH":
      return 2;
    case "DECIDE":
    case "BACKGROUND":
    case "PRICE":
      return 3;
    case "APPROVE":
      return 4;
    case "EXECUTE":
      return 5;
    case "SLEEP":
      return -1;
    default:
      return 0;
  }
}

export function WorkflowPhaseStepper({ phase, skippedDiscover }: WorkflowPhaseStepperProps) {
  const activeIndex = mapPhaseToStepIndex(phase);
  const minCompletedIndex = skippedDiscover ? 1 : -1;

  return (
    <nav
      aria-label="Workflow progress"
      className="mx-auto mb-4 w-full max-w-3xl overflow-x-auto px-1"
    >
      <ol className="flex min-w-max items-center gap-1 text-[10px] uppercase tracking-[0.08em] sm:gap-2 sm:text-[11px]">
        {STEPS.map((step, index) => {
          const completed =
            activeIndex === -1
              ? index <= minCompletedIndex
              : index < activeIndex || index <= minCompletedIndex;
          const active = activeIndex >= 0 && index === activeIndex;
          const dimmed = phase === "SLEEP" && !completed && !active;

          return (
            <li key={step.id} className="flex items-center gap-1 sm:gap-2">
              <span
                className={`rounded-full px-2 py-1 whitespace-nowrap ${
                  active
                    ? "bg-emerald-700 text-white dark:bg-emerald-300 dark:text-emerald-950"
                    : completed
                      ? "bg-slate-200 text-slate-700 dark:bg-white/15 dark:text-neutral-200"
                      : dimmed
                        ? "text-slate-400 dark:text-neutral-600"
                        : "text-slate-500 dark:text-neutral-500"
                }`}
              >
                {step.label}
              </span>
              {index < STEPS.length - 1 ? (
                <span className="text-slate-300 dark:text-neutral-700" aria-hidden="true">
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
