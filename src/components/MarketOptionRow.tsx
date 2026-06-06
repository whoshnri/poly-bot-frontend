import type { RankedMarketItem } from "../types";
import {
  confidenceTone,
  formatConfidence,
  formatEv,
  parseMarketOptionLabel,
} from "../lib/marketLabels";

type MarketOptionRowProps = {
  option: string;
  rank?: number;
  ev?: number;
  confidence?: number;
  selected: boolean;
  inputType: "radio" | "checkbox";
  name?: string;
  onSelect: () => void;
};

const confidenceStyles = {
  low: "bg-amber-100 text-amber-900 dark:bg-amber-300/10 dark:text-amber-200",
  medium: "bg-sky-100 text-sky-900 dark:bg-sky-300/10 dark:text-sky-200",
  high: "bg-emerald-100 text-emerald-900 dark:bg-emerald-300/10 dark:text-emerald-200",
};

export function MarketOptionRow({
  option,
  rank,
  ev,
  confidence,
  selected,
  inputType,
  name,
  onSelect,
}: MarketOptionRowProps) {
  const parsed = parseMarketOptionLabel(option);
  const confidenceLevel =
    typeof confidence === "number" ? confidenceTone(confidence) : null;

  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
        selected
          ? "border-emerald-500/70 bg-emerald-100/80 dark:border-emerald-300/60 dark:bg-emerald-300/10"
          : "border-slate-300 bg-white hover:border-slate-400 dark:border-white/15 dark:bg-black/25 dark:hover:border-white/25"
      }`}
    >
      <input
        type={inputType}
        name={name}
        checked={selected}
        onChange={onSelect}
        className="mt-1 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {typeof rank === "number" ? (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
              #{rank}
            </span>
          ) : null}
          {parsed.marketId ? (
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-neutral-400">
              {parsed.marketId}
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm leading-snug text-slate-900 dark:text-neutral-100">
          {parsed.question}
        </p>

        {typeof ev === "number" || typeof confidence === "number" ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {typeof ev === "number" ? (
              <span className="rounded-full border border-slate-300/80 px-2 py-0.5 text-[11px] text-slate-700 dark:border-white/15 dark:text-neutral-300">
                EV {formatEv(ev)}
              </span>
            ) : null}
        {typeof confidence === "number" && confidenceLevel ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${confidenceStyles[confidenceLevel]}`}
              >
                Confidence {formatConfidence(confidence)}
              </span>
            ) : confidence === 0 ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-800 dark:bg-rose-300/10 dark:text-rose-200">
                Estimate unavailable
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </label>
  );
}

export function RankedMarketPreview({ markets }: { markets: RankedMarketItem[] }) {
  return (
    <div className="space-y-2">
      {markets.map((market) => (
        <div
          key={market.marketId}
          className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3 dark:border-white/10 dark:bg-black/20"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-neutral-100 dark:text-neutral-900">
              #{market.rank}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-neutral-400">
              {market.marketId}
            </span>
          </div>
          <p className="mt-1 text-sm leading-snug text-slate-900 dark:text-neutral-100">
            {market.question}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-300/80 px-2 py-0.5 text-[11px] text-slate-700 dark:border-white/15 dark:text-neutral-300">
              EV {formatEv(market.ev)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                market.confidence > 0
                  ? confidenceStyles[confidenceTone(market.confidence)]
                  : "bg-rose-100 text-rose-800 dark:bg-rose-300/10 dark:text-rose-200"
              }`}
            >
              {market.confidence > 0
                ? `Confidence ${formatConfidence(market.confidence)}`
                : "Estimate unavailable"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankedMarketList({
  markets,
  selectedOption,
  onSelect,
}: {
  markets: RankedMarketItem[];
  selectedOption: string | null;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="space-y-2">
      {markets.map((market) => {
        const option = `[${market.marketId}] ${market.question}`;

        return (
          <MarketOptionRow
            key={market.marketId}
            option={option}
            rank={market.rank}
            ev={market.ev}
            confidence={market.confidence}
            selected={selectedOption === option}
            inputType="radio"
            name="decide-market"
            onSelect={() => onSelect(option)}
          />
        );
      })}
    </div>
  );
}
