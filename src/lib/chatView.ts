import type { BotUiEvent, ChatMessageItem, FeedbackRequestItem, FeedbackType } from "../types";
import { readRankedMarketsFromFeedback } from "./messagePresentation";

export function formatDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatSessionDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const NON_USER_FACING_ERROR_PATTERNS = [
  /\b429\b/,
  /\b503\b/,
  /rate limit/,
  /too many requests/,
  /quota exceeded/,
  /resource_exhausted/,
  /resource exhausted/,
  /circuit breaker/,
  /turn limit reached/,
  /graph turn limit/,
];

function isNonUserFacingErrorText(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  const stripped = normalized.replace(/^something went wrong:\s*/i, "");
  return NON_USER_FACING_ERROR_PATTERNS.some((pattern) => pattern.test(stripped));
}

function messageVariant(payload: Record<string, unknown>): ChatMessageItem["variant"] {
  if (payload.variant === "error") {
    return "error";
  }
  if (payload.variant === "sleep") {
    return "sleep";
  }
  return "default";
}

function formatStageAction(payload: Record<string, unknown>): string | null {
  const stageAction = asString(payload.stageAction);
  const status = asString(payload.status);
  if (!stageAction || !status) {
    return null;
  }

  const reason = asString(payload.reason);
  if (stageAction === "START_TRADE" && status === "dry-run") {
    return `Trade prepared (dry run). ${reason ?? ""}`.trim();
  }
  if (stageAction === "START_TRADE" && status === "executed") {
    return `Trade placed. ${reason ?? ""}`.trim();
  }
  if (stageAction === "WAIT" && status === "scheduled") {
    const resumeAt = asString(payload.resumeAt);
    return `Waiting — ${reason ?? "scheduled wake"}${resumeAt ? ` · next check ${formatDate(resumeAt)}` : ""}`;
  }
  if (stageAction === "SKIP" && status === "skipped") {
    return `Skipped this opportunity. ${reason ?? ""}`.trim();
  }
  if (stageAction === "END_TRADE" && status === "executed") {
    return `Trade closed. ${reason ?? ""}`.trim();
  }
  if (status === "failed" || status === "blocked") {
    return `${stageAction} blocked: ${asString(payload.reason) ?? asString(payload.errorMessage) ?? "Unknown error"}`;
  }
  return `${stageAction} · ${status}`;
}

function isDuplicateUserMessage(
  local: ChatMessageItem,
  remote: ChatMessageItem,
): boolean {
  return (
    local.role === "user" &&
    remote.role === "user" &&
    local.content.trim() === remote.content.trim()
  );
}

function mergeThreadMessages(
  localMessages: ChatMessageItem[],
  eventMessages: ChatMessageItem[],
): ChatMessageItem[] {
  const merged = [...localMessages];

  for (const remote of eventMessages) {
    const duplicateLocalIndex = merged.findIndex((local) =>
      isDuplicateUserMessage(local, remote),
    );
    if (duplicateLocalIndex >= 0) {
      merged[duplicateLocalIndex] = remote;
      continue;
    }

    if (!merged.some((entry) => entry.id === remote.id)) {
      merged.push(remote);
    }
  }

  return merged.sort(
    (left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );
}

export function buildChatView(
  events: BotUiEvent[],
  localMessages: ChatMessageItem[] = [],
): {
  messages: ChatMessageItem[];
  feedback: FeedbackRequestItem | null;
} {
  const messages: ChatMessageItem[] = [];
  const answeredRequestIds = new Set<string>();
  let latestFeedback: FeedbackRequestItem | null = null;

  for (const event of events) {
    if (event.kind === "feedback-answer") {
      const requestId = asString(event.payload.requestId);
      if (requestId) {
        answeredRequestIds.add(requestId);
      }
      continue;
    }

    if (event.kind === "chat-message") {
      const role = event.payload.role === "user" ? "user" : "bot";
      const content = asString(event.payload.content);
      if (!content) {
        continue;
      }
      if (role === "bot" && messageVariant(event.payload) === "error") {
        if (isNonUserFacingErrorText(content)) {
          continue;
        }
      }
      messages.push({
        id: event.id,
        role,
        content,
        subtitle: asString(event.payload.subtitle) ?? undefined,
        timestamp: event.timestamp,
        variant: messageVariant(event.payload),
        contentKind: asString(event.payload.contentKind) ?? undefined,
        contentData:
          event.payload.contentData && typeof event.payload.contentData === "object"
            ? (event.payload.contentData as Record<string, unknown>)
            : undefined,
      });
      continue;
    }

    if (event.kind === "feedback-request") {
      const requestId = asString(event.payload.requestId);
      const type = event.payload.type as FeedbackType;
      const question = asString(event.payload.question);
      if (!requestId || !question) {
        continue;
      }
      latestFeedback = {
        id: event.id,
        requestId,
        type,
        question,
        options: Array.isArray(event.payload.options)
          ? event.payload.options.filter((entry): entry is string => typeof entry === "string")
          : [],
        minSelections:
          typeof event.payload.minSelections === "number"
            ? event.payload.minSelections
            : undefined,
        maxSelections:
          typeof event.payload.maxSelections === "number"
            ? event.payload.maxSelections
            : undefined,
        answered: answeredRequestIds.has(requestId),
        timestamp: event.timestamp,
        workflowPhase: asString(event.payload.phase) ?? undefined,
        rankedMarkets: readRankedMarketsFromFeedback(event.payload) ?? undefined,
      };
      continue;
    }

    if (event.kind === "bot-sleep") {
      const reason = asString(event.payload.reason) ?? "Bot paused — no order placed.";
      messages.push({
        id: event.id,
        role: "bot",
        content: reason,
        subtitle: "Bot sleeping",
        timestamp: event.timestamp,
        variant: "sleep",
      });
      continue;
    }

    if (event.kind === "stage-action") {
      const content = formatStageAction(event.payload);
      if (content) {
        const isError =
          event.payload.status === "failed" || event.payload.status === "blocked";
        messages.push({
          id: event.id,
          role: "bot",
          content,
          subtitle: "Stage action",
          timestamp: event.timestamp,
          variant: isError ? "error" : "default",
        });
      }
      continue;
    }

    if (event.kind === "graph-run-error") {
      const errorMessage = asString(event.payload.errorMessage);
      if (errorMessage && isNonUserFacingErrorText(errorMessage)) {
        continue;
      }
      messages.push({
        id: event.id,
        role: "bot",
        content: `Something went wrong: ${asString(event.payload.errorMessage) ?? "Unknown error"}`,
        subtitle: asString(event.payload.context) ?? "Run error",
        timestamp: event.timestamp,
        variant: "error",
      });
      continue;
    }

    if (event.kind === "graph-run-complete") {
      const stopReason = asString(event.payload.stopReason);
      if (event.payload.failed === true && stopReason) {
        if (!isNonUserFacingErrorText(stopReason)) {
          messages.push({
            id: `${event.id}-failed`,
            role: "bot",
            content: stopReason.startsWith("Something went wrong:")
              ? stopReason
              : `Something went wrong: ${stopReason}`,
            subtitle: "Run stopped",
            timestamp: event.timestamp,
            variant: "error",
          });
        }
      } else if (
        stopReason &&
        !isNonUserFacingErrorText(stopReason) &&
        (event.payload.circuitBreakerTripped === true ||
          event.payload.turnLimitReached === true)
      ) {
        messages.push({
          id: `${event.id}-complete`,
          role: "bot",
          content: stopReason,
          subtitle: "Run stopped",
          timestamp: event.timestamp,
          variant: "error",
        });
      }
    }
  }

  if (latestFeedback) {
    latestFeedback = {
      ...latestFeedback,
      answered: answeredRequestIds.has(latestFeedback.requestId),
    };
  }

  return {
    messages: mergeThreadMessages(localMessages, messages),
    feedback: latestFeedback && !latestFeedback.answered ? latestFeedback : null,
  };
}

export function isBotSleeping(events: BotUiEvent[]): boolean {
  return events.some((event) => event.kind === "bot-sleep");
}

export function createLocalUserMessage(content: string): ChatMessageItem {
  return {
    id: `local-user-${Date.now()}`,
    role: "user",
    content,
    timestamp: new Date().toISOString(),
  };
}
