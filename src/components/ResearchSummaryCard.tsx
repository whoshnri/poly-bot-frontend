import type { ResearchSummaryContent } from "../types";
import { formatConfidence } from "../lib/marketLabels";

type ResearchSummaryCardProps = {
  summary: ResearchSummaryContent;
  compact?: boolean;
};

export function ResearchSummaryCard({ summary, compact = false }: ResearchSummaryCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
            Research summary
          </p>
          <h4 className="mt-1 text-base leading-snug text-slate-900 dark:text-neutral-100">
            {summary.topic}
          </h4>
        </div>
        {summary.marketId ? (
          <span className="rounded-full border border-slate-300/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-white/15 dark:text-neutral-300">
            {summary.marketId}
          </span>
        ) : null}
      </div>

      <ol className="space-y-2">
        {summary.sources.slice(0, compact ? 2 : 4).map((source, index) => (
          <li
            key={`${source.url}-${index}`}
            className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 dark:border-white/10 dark:bg-black/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug text-slate-900 dark:text-neutral-100">
                  {index + 1}. {source.title}
                </p>
                {source.snippet && !compact ? (
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600 dark:text-neutral-400">
                    {source.snippet}
                  </p>
                ) : null}
              </div>
              {typeof source.score === "number" ? (
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
                  {formatConfidence(source.score)}
                </span>
              ) : null}
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block truncate text-xs text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >
              {source.url}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
