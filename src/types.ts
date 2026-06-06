export type SessionResumeMode =
  | "awaiting_feedback"
  | "continue"
  | "sleeping"
  | "complete"
  | "idle";

export type SessionResumeState = {
  canContinue: boolean;
  mode: SessionResumeMode;
  phase: string;
  message: string;
};

export type SessionSummary = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  resume: SessionResumeState;
  latestStage: {
    sequence: number;
    summary: string;
    todo: string;
    sessionAction: string;
    stageActionCompleted: boolean;
    nextWake: string;
    createdAt: string;
  } | null;
};

export type StartSessionResponse = {
  sessionId: string;
  name: string;
  createdAt: string;
  message: string;
};

export type ResumeSessionResponse = {
  sessionId: string;
  message: string;
  resume?: SessionSummary["resume"];
};

export type FeedbackType = "mcq" | "text" | "mcq_or_custom" | "multi_select";

export type PendingFeedback = {
  requestId: string;
  type: FeedbackType;
  question: string;
  options: string[];
  minSelections?: number;
  maxSelections?: number;
  reason: string;
  createdAt: string;
};

export type BotUiEventKind =
  | "graph-run-start"
  | "graph-run-complete"
  | "graph-run-error"
  | "graph-node"
  | "ai-response"
  | "tool-call"
  | "tool-result"
  | "stage-action"
  | "chat-message"
  | "feedback-request"
  | "feedback-answer"
  | "bot-sleep";

export type BotUiEvent = {
  id: string;
  sessionId: string;
  timestamp: string;
  kind: BotUiEventKind;
  payload: Record<string, unknown>;
};

export type ChatMessageItem = {
  id: string;
  role: "user" | "bot";
  content: string;
  subtitle?: string;
  timestamp: string;
  variant?: "default" | "error" | "sleep";
  contentKind?: string;
  contentData?: Record<string, unknown>;
};

export type ResearchSourcePreview = {
  title: string;
  url: string;
  snippet?: string;
  score?: number;
};

export type ResearchSummaryContent = {
  marketId?: string;
  topic: string;
  sources: ResearchSourcePreview[];
};

export type RankedMarketItem = {
  rank: number;
  marketId: string;
  question: string;
  ev: number;
  confidence: number;
};

export type DecideSummaryContent = {
  rankedMarkets: RankedMarketItem[];
};

export type FeedbackRequestItem = {
  id: string;
  requestId: string;
  type: FeedbackType;
  question: string;
  options: string[];
  minSelections?: number;
  maxSelections?: number;
  answered: boolean;
  timestamp: string;
  workflowPhase?: string;
  rankedMarkets?: RankedMarketItem[];
};
