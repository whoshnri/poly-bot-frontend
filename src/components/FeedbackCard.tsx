import { useState } from "react";
import type { FeedbackRequestItem } from "../types";
import { MarkdownContent } from "./MarkdownContent";
import { MarketOptionRow, RankedMarketList } from "./MarketOptionRow";

type FeedbackCardProps = {
  feedback: FeedbackRequestItem;
  submitting: boolean;
  submitLabel?: string;
  onDismiss?: () => void;
  onSubmit: (answer: {
    selectedOption?: string;
    selectedOptions?: string[];
    customText?: string;
    textAnswer?: string;
  }) => void;
};

const APPROVE_OPTIONS = ["Yes, place order", "No, cancel"];

export function FeedbackCard({
  feedback,
  submitting,
  submitLabel,
  onDismiss,
  onSubmit,
}: FeedbackCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [textAnswer, setTextAnswer] = useState("");

  const isApprovalGate = feedback.workflowPhase === "APPROVE";
  const isDecideGate = feedback.workflowPhase === "DECIDE";
  const isTextOnly = feedback.type === "text";
  const supportsCustom = feedback.type === "mcq_or_custom" || isApprovalGate;
  const displayOptions = isApprovalGate
    ? APPROVE_OPTIONS
    : (feedback.options ?? []);
  const hasOptions = displayOptions.length > 0;
  const isMultiSelect = feedback.type === "multi_select";
  const isMultipleChoice = hasOptions && !isMultiSelect;
  const rankedMarkets = feedback.rankedMarkets ?? [];
  const multiSelectHint =
    isMultiSelect && feedback.maxSelections
      ? `Pick ${feedback.minSelections ?? 1}-${feedback.maxSelections} markets.`
      : isMultiSelect
        ? "Pick one or more markets."
        : null;

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-300/70 bg-white/90 p-4 sm:p-5 dark:border-white/15 dark:bg-black/30">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
          {isApprovalGate
            ? "Trade approval required"
            : isDecideGate
              ? "Pick your focus market"
              : isMultiSelect
                ? "Build your shortlist"
                : "Needs your input"}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase text-slate-500 dark:text-neutral-400">
            {feedback.type.replaceAll("_", " ")}
          </span>
          {onDismiss ? (
            <button
              type="button"
              className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/10"
              onClick={onDismiss}
            >
              Hide
            </button>
          ) : null}
        </div>
      </header>

      <div className="mb-3 text-base leading-relaxed text-slate-900 dark:text-neutral-100">
        <MarkdownContent content={feedback.question} />
      </div>

      {isDecideGate ? (
        <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          Markets are ranked lowest-to-highest expected value. Choose one to continue
          with detailed background research.
        </p>
      ) : null}

      {isApprovalGate ? (
        <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          Approve to place the order, decline to put the bot to sleep, or
          describe a new direction below.
        </p>
      ) : null}

      {multiSelectHint ? (
        <p className="mb-4 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {multiSelectHint}
        </p>
      ) : null}

      {isTextOnly && !hasOptions ? (
        <textarea
          className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base leading-relaxed text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100"
          rows={4}
          placeholder="Share your answer..."
          value={textAnswer}
          onChange={(event) => setTextAnswer(event.target.value)}
        />
      ) : null}

      {isDecideGate && rankedMarkets.length > 0 ? (
        <div className="mb-4">
          <RankedMarketList
            markets={rankedMarkets}
            selectedOption={selectedOption}
            onSelect={setSelectedOption}
          />
        </div>
      ) : null}

      {isMultipleChoice && !isDecideGate ? (
        <div className="mb-4 space-y-2">
          {displayOptions.map((option) => (
            <MarketOptionRow
              key={option}
              option={option}
              selected={selectedOption === option}
              inputType="radio"
              name={`feedback-${feedback.requestId}`}
              onSelect={() => setSelectedOption(option)}
            />
          ))}
        </div>
      ) : null}

      {isMultiSelect ? (
        <div className="mb-4 space-y-2">
          {displayOptions.map((option) => {
            const checked = selectedOptions.includes(option);
            return (
              <MarketOptionRow
                key={option}
                option={option}
                selected={checked}
                inputType="checkbox"
                onSelect={() =>
                  setSelectedOptions((current) =>
                    checked
                      ? current.filter((entry) => entry !== option)
                      : [...current, option],
                  )
                }
              />
            );
          })}
        </div>
      ) : null}

      {!isTextOnly && !isMultipleChoice && !isDecideGate ? (
        <p className="mb-3 text-sm text-slate-500 dark:text-neutral-400">
          No predefined options were provided. Enter your response below.
        </p>
      ) : null}

      {supportsCustom ? (
        <label className="mb-4 block text-sm text-slate-600 dark:text-neutral-300">
          {isApprovalGate
            ? "Or give new instructions"
            : "Or enter your own answer"}
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100"
            value={customText}
            onChange={(event) => setCustomText(event.target.value)}
            placeholder={
              isApprovalGate
                ? "e.g. Focus on a different market instead..."
                : "Type a custom response..."
            }
          />
        </label>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        {isApprovalGate ? (
          <>
            <button
              type="button"
              className="min-h-11 w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-700 disabled:opacity-50 sm:w-auto dark:border-white/20 dark:text-neutral-200"
              disabled={submitting}
              onClick={() => onSubmit({ selectedOption: "No, cancel" })}
            >
              Decline
            </button>
            <button
              type="button"
              className="min-h-11 w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto dark:bg-neutral-100 dark:text-neutral-900"
              disabled={submitting}
              onClick={() => onSubmit({ selectedOption: "Yes, place order" })}
            >
              {submitting ? "Submitting..." : "Approve trade"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="min-h-11 w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto dark:bg-neutral-100 dark:text-neutral-900"
            disabled={
              submitting ||
              (isDecideGate && !selectedOption) ||
              (isMultiSelect && selectedOptions.length === 0)
            }
            onClick={() => {
              if (isMultipleChoice || isDecideGate) {
                onSubmit({ selectedOption: selectedOption ?? undefined });
                return;
              }
              if (isMultiSelect) {
                onSubmit({ selectedOptions });
                return;
              }
              if (isTextOnly) {
                onSubmit({ textAnswer });
                return;
              }
              onSubmit({
                selectedOption: selectedOption ?? undefined,
                customText: customText.trim() || undefined,
              });
            }}
          >
            {submitting ? "Submitting..." : submitLabel ?? "Submit answer"}
          </button>
        )}

        {isApprovalGate && customText.trim() ? (
          <button
            type="button"
            className="min-h-11 w-full rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-700 disabled:opacity-50 sm:w-auto dark:border-white/20 dark:text-neutral-200"
            disabled={submitting}
            onClick={() => onSubmit({ textAnswer: customText.trim() })}
          >
            Send new direction
          </button>
        ) : null}
      </div>
    </section>
  );
}
