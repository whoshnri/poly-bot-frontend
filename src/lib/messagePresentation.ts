import type {
  ChatMessageItem,
  DecideSummaryContent,
  ResearchSummaryContent,
} from "../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseResearchFromLegacyContent(content: string): ResearchSummaryContent | null {
  if (!content.includes("# Web research:") && !content.includes("Research summary")) {
    return null;
  }

  const topicMatch = content.match(/# Web research:\s*(.+)/) ??
    content.match(/Research summary(?:\s*\(([^)]+)\))?\n([\s\S]+)/);

  let topic = "Market research";
  let marketId: string | undefined;

  if (content.includes("# Web research:")) {
    topic = topicMatch?.[1]?.trim() ?? topic;
  } else {
    marketId = typeof topicMatch?.[1] === "string" ? topicMatch[1].trim() : undefined;
    topic = topicMatch?.[2]?.split("\n")[0]?.trim() ?? topic;
  }

  const sources: ResearchSummaryContent["sources"] = [];
  const blocks = content.split(/\n(?=\d+\.\s)/);

  for (const block of blocks) {
    const titleMatch = block.match(/^\d+\.\s*(.+)$/m);
    const urlMatch = block.match(/^\s*URL:\s*(\S+)/m);
    const scoreMatch = block.match(/^\s*Score:\s*([\d.]+)/m);
    const snippetMatch = block.match(/^\s*Snippet:\s*(.+)$/m);
    if (!titleMatch?.[1] || !urlMatch?.[1]) {
      continue;
    }

    sources.push({
      title: titleMatch[1].trim(),
      url: urlMatch[1].trim(),
      snippet: snippetMatch?.[1]?.trim(),
      score: scoreMatch?.[1] ? Number(scoreMatch[1]) : undefined,
    });
  }

  if (sources.length === 0) {
    return null;
  }

  return { topic, marketId, sources };
}

function parseDecideFromLegacyContent(content: string): DecideSummaryContent | null {
  if (!content.includes("Deterministic scoring is complete") && !content.includes("Scoring complete")) {
    return null;
  }

  const lines = content.split("\n");
  const rankedMarkets: DecideSummaryContent["rankedMarkets"] = [];

  for (const line of lines) {
    const match = line.match(
      /^(\d+)\.\s*(.+?)\s*·\s*EV\s*([+-]?[\d.]+)\s*·\s*confidence\s*([\d.]+)/,
    );
    if (!match) {
      continue;
    }

    rankedMarkets.push({
      rank: Number(match[1]),
      marketId: "unknown",
      question: match[2]?.trim() ?? "Unknown market",
      ev: Number(match[3]),
      confidence: Number(match[4]),
    });
  }

  return rankedMarkets.length > 0 ? { rankedMarkets } : null;
}

export function resolveResearchSummary(message: ChatMessageItem): ResearchSummaryContent | null {
  if (message.contentKind === "research-summary" && message.contentData) {
    const data = message.contentData as ResearchSummaryContent;
    if (typeof data.topic === "string" && Array.isArray(data.sources)) {
      return data;
    }
  }

  return parseResearchFromLegacyContent(message.content);
}

export function resolveDecideSummary(message: ChatMessageItem): DecideSummaryContent | null {
  if (message.contentKind === "decide-summary" && message.contentData) {
    const data = message.contentData as DecideSummaryContent;
    if (Array.isArray(data.rankedMarkets)) {
      return data;
    }
  }

  return parseDecideFromLegacyContent(message.content);
}

export function readRankedMarketsFromFeedback(payload: Record<string, unknown>) {
  const raw = payload.rankedMarkets;
  if (!Array.isArray(raw)) {
    return null;
  }

  const rankedMarkets = raw
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry, index) => ({
      rank: typeof entry.rank === "number" ? entry.rank : index + 1,
      marketId: typeof entry.marketId === "string" ? entry.marketId : "unknown",
      question: typeof entry.question === "string" ? entry.question : "Unknown market",
      ev: typeof entry.ev === "number" ? entry.ev : 0,
      confidence: typeof entry.confidence === "number" ? entry.confidence : 0,
    }));

  return rankedMarkets.length > 0 ? rankedMarkets : null;
}
