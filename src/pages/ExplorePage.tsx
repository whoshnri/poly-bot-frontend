import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { discoverChatRequest, discoverRunRequest } from "../api/discover";
import { useAuth } from "../hooks/useAuth";
import { useOnboarding } from "../hooks/useOnboarding";
import { useSettings } from "../hooks/useSettings";
import { useShellStatus } from "../hooks/useShellStatus";
import type { DiscoverMarketOption } from "../lib/preSessionDraft";
import {
  clearPreSessionDraft,
  readPreSessionDraft,
  writePreSessionDraft,
} from "../lib/preSessionDraft";
import { ChatThread } from "../components/ChatThread";
import { exploreMessagesToChatItems } from "../lib/chatView";
import { formatExploreMarketOption, parseMarketIdFromOption } from "../lib/marketLabels";
import type { FeedbackRequestItem } from "../types";
import { useShellContext } from "./LoginPage";

type ExploreMessage = {
  id: string;
  role: "user" | "bot";
  content: string;
  timestamp: string;
};

function createMessage(role: ExploreMessage["role"], content: string): ExploreMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    timestamp: new Date().toISOString(),
  };
}

export function ExplorePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startSession, clearPendingStartForUser } = useShellContext();
  const { readiness, loading: settingsLoading, loadReadiness } = useSettings();
  const { openOnboarding } = useOnboarding();
  const { setStatus: setShellStatus } = useShellStatus();

  const draft = readPreSessionDraft();
  const [messages, setMessages] = useState<ExploreMessage[]>(() =>
    draft?.messages?.length
      ? draft.messages.map((entry, index) => ({
          id: `draft-${index}`,
          role: entry.role,
          content: entry.content,
          timestamp: entry.timestamp,
        }))
      : [
          createMessage(
            "bot",
            "Hi! Tell me what you want to explore on Polymarket — a topic, event, or thesis — and I'll help you find active markets.",
          ),
        ],
  );
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState(draft?.topic ?? "");
  const [queries, setQueries] = useState<string[]>(draft?.queries ?? []);
  const [markets, setMarkets] = useState<DiscoverMarketOption[]>(draft?.markets ?? []);
  const [chatLoading, setChatLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [marketPickerDismissed, setMarketPickerDismissed] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const threadRef = useRef<HTMLDivElement>(null);

  const persistDraft = useCallback(
    (patch: Partial<{
      topic: string;
      queries: string[];
      markets: DiscoverMarketOption[];
      messages: ExploreMessage[];
    }>) => {
      const nextTopic = patch.topic ?? topic;
      const nextQueries = patch.queries ?? queries;
      const nextMarkets = patch.markets ?? markets;
      const nextMessages = patch.messages ?? messages;

      writePreSessionDraft({
        topic: nextTopic,
        queries: nextQueries,
        markets: nextMarkets,
        messages: nextMessages.map((entry) => ({
          role: entry.role,
          content: entry.content,
          timestamp: entry.timestamp,
        })),
        updatedAt: Date.now(),
      });
    },
    [markets, messages, queries, topic],
  );

  useEffect(() => {
    setShellStatus(status);
  }, [setShellStatus, status]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, markets, chatLoading, searchLoading, marketPickerDismissed]);

  const ensureReady = useCallback(async () => {
    const latest = readiness ?? (await loadReadiness());
    if (latest.canRunBot) {
      return true;
    }
    setStatus(latest.message ?? "Finish account setup before running the bot.");
    openOnboarding();
    return false;
  }, [loadReadiness, openOnboarding, readiness]);

  const runDiscoverSearch = useCallback(
    async (nextTopic: string, nextQueries: string[]) => {
      setSearchLoading(true);
      setStatus("Searching active Polymarket markets...");
      try {
        const result = await discoverRunRequest({
          topic: nextTopic,
          queries: nextQueries,
        });
        setTopic(result.topic || nextTopic);
        setQueries(result.queries);
        setMarkets(result.markets);
        setMarketPickerDismissed(false);
        persistDraft({
          topic: result.topic || nextTopic,
          queries: result.queries,
          markets: result.markets,
        });

        const botMessage = createMessage(
          "bot",
          result.markets.length > 0
            ? `Found **${result.markets.length}** active markets. Pick one or more in the card below to start research and the trade workflow.`
            : "I couldn't find active markets for that topic. Try refining your idea or search terms.",
        );
        setMessages((current) => {
          const next = [...current, botMessage];
          persistDraft({ messages: next });
          return next;
        });
        setStatus("Pick markets to research");
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "Market search failed.");
      } finally {
        setSearchLoading(false);
      }
    },
    [persistDraft],
  );

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || chatLoading) {
      return;
    }

    const userMessage = createMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    persistDraft({ messages: nextMessages });

    setChatLoading(true);
    setStatus("Thinking...");
    try {
      const payload = nextMessages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));
      const result = await discoverChatRequest(payload);
      const botMessage = createMessage("bot", result.reply);
      const withBot = [...nextMessages, botMessage];
      setMessages(withBot);

      const nextTopic = result.topic?.trim() || topic || trimmed;
      const nextQueries = result.queries ?? queries;
      if (result.topic) {
        setTopic(result.topic);
      }
      if (result.queries?.length) {
        setQueries(result.queries);
      }
      persistDraft({
        messages: withBot,
        topic: nextTopic,
        queries: nextQueries,
      });

      if (result.readyToSearch && nextQueries.length > 0) {
        await runDiscoverSearch(nextTopic, nextQueries);
      } else {
        setStatus("Ready.");
      }
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Chat failed.");
      const errorMessage = createMessage(
        "bot",
        `Sorry — I couldn't process that. ${error instanceof Error ? error.message : "Please try again."}`,
      );
      setMessages((current) => [...current, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  }, [chatLoading, input, messages, persistDraft, queries, runDiscoverSearch, topic]);

  const handleMarketSelection = useCallback(
    async (answer: { selectedOptions?: string[] }) => {
      const selectedOptions = answer.selectedOptions ?? [];
      const selectedMarketIds = selectedOptions
        .map((option) => parseMarketIdFromOption(option))
        .filter((marketId): marketId is string => Boolean(marketId));

      if (selectedMarketIds.length === 0 || !user?.userId) {
        return;
      }

      if (!(await ensureReady())) {
        return;
      }

      const primaryMarketId = selectedMarketIds[0]!;
      const selectedMarkets = markets.filter((market) =>
        selectedMarketIds.includes(market.marketId),
      );

      setStarting(true);
      setStatus("Starting session...");
      try {
        const sessionTopic = topic.trim() || selectedMarkets[0]?.question || "Selected markets";
        const lastBotReply = [...messages].reverse().find((entry) => entry.role === "bot")?.content;
        const data = await startSession(
          `Research and evaluate markets about: ${sessionTopic}`,
          {
            topic: sessionTopic,
            summary: lastBotReply?.trim() || sessionTopic,
            queries,
            selectedMarketId: primaryMarketId,
            selectedMarketIds,
            markets,
            exploreMessages: messages.slice(-6).map((entry) => ({
              role: entry.role,
              content: entry.content,
            })),
          },
        );
        clearPreSessionDraft();
        clearPendingStartForUser();
        if (data.sessionId) {
          navigate(`/${data.sessionId}`);
        }
        setStatus(data.message);
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "Failed to start session.");
      } finally {
        setStarting(false);
      }
    },
    [
      clearPendingStartForUser,
      ensureReady,
      markets,
      messages,
      navigate,
      queries,
      startSession,
      topic,
      user?.userId,
    ],
  );

  const marketFeedback = useMemo((): FeedbackRequestItem | null => {
    if (markets.length === 0) {
      return null;
    }

    return {
      id: "explore-market-picker",
      requestId: "explore-market-picker",
      type: "multi_select",
      question:
        "Which markets should we research? Pick one or more — I'll run Tavily research, score them, and walk you through approval.",
      options: markets.map((market) => formatExploreMarketOption(market)),
      minSelections: 1,
      maxSelections: markets.length,
      answered: false,
      timestamp: new Date().toISOString(),
      workflowPhase: "EXPLORE",
    };
  }, [markets]);

  const chatMessages = useMemo(() => exploreMessagesToChatItems(messages), [messages]);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      <motion.div
        layout
        className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-3 md:px-8 md:pb-8 md:pt-6"
        ref={threadRef}
      >
        <ChatThread
          messages={chatMessages}
          isRunning={chatLoading || searchLoading || starting}
          greeting="What should we explore?"
          emptyDescription="Tell me a topic, event, or thesis and I'll help you find active Polymarket markets before starting research."
          showTimestamps={false}
          feedback={marketFeedback}
          feedbackDismissed={marketPickerDismissed}
          feedbackSubmitting={starting}
          feedbackSubmitLabel="Start research"
          onFeedbackDismiss={() => setMarketPickerDismissed(true)}
          onFeedbackRestore={() => setMarketPickerDismissed(false)}
          onFeedbackSubmit={(answer) => {
            void handleMarketSelection(answer);
          }}
        />
      </motion.div>

      <motion.div
        layout
        className="shrink-0 border-t border-slate-300/50 px-4 pb-safe pt-3 backdrop-blur dark:border-white/10 md:px-8 md:pb-4"
      >
        <div className="mx-auto w-full max-w-3xl space-y-3">
          {!settingsLoading && readiness && !readiness.canRunBot ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {readiness.message ?? "Configure your AI provider before starting."}
            </p>
          ) : null}

          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <input
              className="min-h-11 flex-1 rounded-full border border-slate-300 bg-white px-4 text-base text-slate-900 outline-none dark:border-white/15 dark:bg-black/35 dark:text-neutral-100"
              placeholder="Describe what you want to trade on…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={chatLoading || searchLoading || starting}
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-full bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              disabled={chatLoading || searchLoading || starting || input.trim().length === 0}
            >
              Send
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
