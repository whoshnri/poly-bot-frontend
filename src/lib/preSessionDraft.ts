export type DiscoverMarketOption = {
  marketId: string;
  question: string;
  eventTitle?: string;
  score: number;
  volume?: number;
  liquidity?: number;
};

export type PreSessionDraft = {
  topic: string;
  summary?: string;
  queries: string[];
  markets: DiscoverMarketOption[];
  messages: Array<{ role: "user" | "bot"; content: string; timestamp: string }>;
  selectedMarketId?: string;
  updatedAt: number;
};

const KEY = "pm:preSession:v1";

export function readPreSessionDraft(): PreSessionDraft | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as PreSessionDraft;
  } catch {
    return null;
  }
}

export function writePreSessionDraft(draft: PreSessionDraft): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {
    // Ignore.
  }
}

export function clearPreSessionDraft(): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
