import type { DiscoverMarketOption } from "./preSessionDraft";

export type ParsedMarketLabel = {
  marketId: string | null;
  question: string;
  raw: string;
};

export function parseMarketOptionLabel(option: string): ParsedMarketLabel {
  const match = option.match(/^\[([^\]]+)\]\s*(.+)$/);
  if (!match) {
    return { marketId: null, question: option.trim(), raw: option };
  }

  return {
    marketId: match[1]?.trim() ?? null,
    question: match[2]?.trim() ?? option.trim(),
    raw: option,
  };
}

export function formatEv(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(4)}`;
}

export function formatConfidence(value: number): string {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function confidenceTone(value: number): "low" | "medium" | "high" {
  if (value >= 0.7) {
    return "high";
  }
  if (value >= 0.45) {
    return "medium";
  }
  return "low";
}

export function formatExploreMarketOption(
  market: Pick<DiscoverMarketOption, "marketId" | "question">,
): string {
  return `[${market.marketId}] ${market.question}`;
}

export function parseMarketIdFromOption(option: string): string | null {
  return parseMarketOptionLabel(option).marketId;
}
