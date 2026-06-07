import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { discoverChatRequest, discoverRunRequest } from "../api/discover";
import { useAuth } from "../hooks/useAuth";
import { useOnboarding } from "../hooks/useOnboarding";
import { useSettings } from "../hooks/useSettings";
import type { DiscoverMarketOption } from "../lib/preSessionDraft";
import {
  clearPreSessionDraft,
  readPreSessionDraft,
  writePreSessionDraft,
} from "../lib/preSessionDraft";
import { MarkdownContent } from "../components/MarkdownContent";
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
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(
    draft?.selectedMarketId ?? null,
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const threadRef = useRef<HTMLDivElement>(null);

  const persistDraft = useCallback(
    (patch: Partial<{
      topic: string;
      queries: string[];
      markets: DiscoverMarketOption[];
      selectedMarketId: string;
      messages: ExploreMessage[];
    }>) => {
      const nextTopic = patch.topic ?? topic;
      const nextQueries = patch.queries ?? queries;
      const nextMarkets = patch.markets ?? markets;
      const nextMessages = patch.messages ?? messages;
      const nextSelected = patch.selectedMarketId ?? selectedMarketId ?? undefined;

      writePreSessionDraft({
        topic: nextTopic,
        queries: nextQueries,
        markets: nextMarkets,
        selectedMarketId: nextSelected,
        messages: nextMessages.map((entry) => ({
          role: entry.role,
          content: entry.content,
          timestamp: entry.timestamp,
        })),
        updatedAt: Date.now(),
      });
    },
    [markets, messages, queries, selectedMarketId, topic],
  );

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, markets, chatLoading, searchLoading]);

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
        setSelectedMarketId(result.markets[0]?.marketId ?? null);
        persistDraft({
          topic: result.topic || nextTopic,
          queries: result.queries,
          markets: result.markets,
          selectedMarketId: result.markets[0]?.marketId,
        });

        const botMessage = createMessage(
          "bot",
          result.markets.length > 0
            ? `Found **${result.markets.length}** active markets. Pick one below, then start a session to run Tavily research and the trade workflow.`
            : "I couldn't find active markets for that topic. Try refining your idea or search terms.",
        );
        setMessages((current) => {
          const next = [...current, botMessage];
          persistDraft({ messages: next });
          return next;
        });
        setStatus("Search complete.");
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

  const handleStartSession = useCallback(async () => {
    if (!selectedMarketId || !user?.userId) {
      return;
    }

    const selected = markets.find((market) => market.marketId === selectedMarketId);
    if (!selected) {
      return;
    }

    if (!(await ensureReady())) {
      return;
    }

    setStarting(true);
    setStatus("Starting session with your selected market...");
    try {
      const sessionTopic = topic.trim() || selected.question;
      const data = await startSession(
        `Research and evaluate markets about: ${sessionTopic}`,
        {
          topic: sessionTopic,
          queries,
          selectedMarketId: selected.marketId,
          markets,
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
  }, [
    clearPendingStartForUser,
    ensureReady,
    markets,
    navigate,
    queries,
    selectedMarketId,
    startSession,
    topic,
    user?.userId,
  ]);

  const selectedMarket = useMemo(
    () => markets.find((market) => market.marketId === selectedMarketId) ?? null,
    [markets, selectedMarketId],
  );

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden">
      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      <motion.div
        layout
        className="no-scrollbar flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-[calc(3.5rem+env(safe-area-inset-top))] md:px-8 md:pb-8 md:pt-6"
        ref={threadRef}
      >
        <div className="mx-auto w-full max-w-3xl space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === "user"
                  ? "ml-auto max-w-[92%] rounded-2xl bg-slate-900 px-4 py-3 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "mr-auto max-w-[92%] rounded-2xl border border-slate-300/70 bg-white/90 px-4 py-3 dark:border-white/15 dark:bg-black/30"
              }
            >
              <MarkdownContent
                content={message.content}
                className={
                  message.role === "user"
                    ? "text-sm leading-relaxed text-neutral-100 dark:text-neutral-900"
                    : "text-sm leading-relaxed text-slate-800 dark:text-neutral-100"
                }
              />
            </div>
          ))}

          {(chatLoading || searchLoading) && (
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              {searchLoading ? "Searching markets…" : "Thinking…"}
            </p>
          )}

          {markets.length > 0 ? (
            <section className="rounded-2xl border border-slate-300/70 bg-white/90 p-4 dark:border-white/15 dark:bg-black/30">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                Active markets
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Ranked by relevance, volume, and liquidity. Select one to start the workflow at
                research.
              </p>
              <ul className="mt-3 space-y-2">
                {markets.map((market) => {
                  const selected = market.marketId === selectedMarketId;
                  return (
                    <li key={market.marketId}>
                      <button
                        type="button"
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40"
                            : "border-slate-300/70 bg-white hover:bg-slate-50 dark:border-white/15 dark:bg-black/20 dark:hover:bg-white/5"
                        }`}
                        onClick={() => {
                          setSelectedMarketId(market.marketId);
                          persistDraft({ selectedMarketId: market.marketId });
                        }}
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-neutral-100">
                          {market.question}
                        </p>
                        {market.eventTitle ? (
                          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                            {market.eventTitle}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                          Score {market.score.toFixed(2)}
                          {market.volume ? ` · Vol ${Math.round(market.volume).toLocaleString()}` : ""}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
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

          {selectedMarket ? (
            <button
              type="button"
              className="min-h-11 w-full rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-emerald-300 dark:text-emerald-950"
              disabled={starting || settingsLoading}
              onClick={() => {
                void handleStartSession();
              }}
            >
              {starting ? "Starting session…" : `Start session on “${selectedMarket.question.slice(0, 48)}${selectedMarket.question.length > 48 ? "…" : ""}”`}
            </button>
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
              disabled={chatLoading || searchLoading}
            />
            <button
              type="submit"
              className="min-h-11 shrink-0 rounded-full bg-slate-900 px-5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              disabled={chatLoading || searchLoading || input.trim().length === 0}
            >
              Send
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
