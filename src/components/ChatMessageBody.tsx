import type { ChatMessageItem } from "../types";
import { resolveDecideSummary, resolveResearchSummary } from "../lib/messagePresentation";
import { MarkdownContent } from "./MarkdownContent";
import { ResearchSummaryCard } from "./ResearchSummaryCard";
import { RankedMarketPreview } from "./MarketOptionRow";

type ChatMessageBodyProps = {
  message: ChatMessageItem;
};

export function ChatMessageBody({ message }: ChatMessageBodyProps) {
  const researchSummary = resolveResearchSummary(message);
  if (researchSummary) {
    return <ResearchSummaryCard summary={researchSummary} />;
  }

  const decideSummary = resolveDecideSummary(message);
  if (decideSummary) {
    return (
      <div className="space-y-3">
        <MarkdownContent
          content="Scoring is complete. **Review the ranked markets below**, then choose one in the card underneath."
          className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300"
        />
        <RankedMarketPreview markets={decideSummary.rankedMarkets} />
      </div>
    );
  }

  if (message.subtitle) {
    return (
      <div className="space-y-2">
        <MarkdownContent
          content={message.content}
          className="text-[0.9375rem] leading-6 text-slate-800 sm:text-sm sm:leading-7 dark:text-neutral-100"
        />
        <p className="text-[11px] uppercase tracking-[0.06em] text-slate-500 dark:text-neutral-500">
          {message.subtitle}
        </p>
      </div>
    );
  }

  return (
    <MarkdownContent
      content={message.content}
      className="text-[0.9375rem] leading-6 text-slate-800 sm:text-sm sm:leading-7 dark:text-neutral-100"
    />
  );
}
