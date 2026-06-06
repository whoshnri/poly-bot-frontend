import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { submitFeedbackRequest, fetchPendingFeedbackRequest } from "../api/sessions";
import { useEventStream } from "../hooks/useEventStream";
import { useOnboarding } from "../hooks/useOnboarding";
import { useSettings } from "../hooks/useSettings";
import type { ChatMessageItem } from "../types";
import { buildChatView, createLocalUserMessage, isBotSleeping } from "../lib/chatView";
import { ChatThread } from "../components/ChatThread";
import { FeedbackCard } from "../components/FeedbackCard";
import { useShellContext } from "./LoginPage";

const START_DISCOVERY_INSTRUCTION = "Start active market discovery.";

type PendingRunAction =
  | { type: "start"; instruction: string }
  | { type: "resume"; sessionId: string }
  | { type: "continue"; sessionId: string; instruction: string };

export function PlaygroundPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { sessions, loadSessions, startSession, resumeSession } = useShellContext();
  const { readiness, loading: settingsLoading, loadReadiness } = useSettings();
  const { openOnboarding } = useOnboarding();
  const activeSessionId = sessionId ?? null;
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const pendingRunRef = useRef<PendingRunAction | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const onRunFinished = useCallback(() => {
    setIsRunning(false);
    void loadSessions();
  }, [loadSessions]);

  const { events, resetEvents } = useEventStream({
    sessionId: activeSessionId,
    onStatus: setStatus,
    onRunFinished,
  });

  const { messages, feedback } = useMemo(() => buildChatView(events, localMessages), [events, localMessages]);
  const botSleeping = useMemo(() => isBotSleeping(events), [events]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, feedback, isRunning]);

  useEffect(() => {
    resetEvents();
    setLocalMessages([]);
    setIsRunning(false);
  }, [activeSessionId, resetEvents]);

  const executePendingRun = useCallback(
    async (action: PendingRunAction) => {
      if (action.type === "start") {
        const userMessage = createLocalUserMessage(action.instruction);
        setLocalMessages([userMessage]);
        setIsRunning(true);
        setStatus("Starting session from your instruction...");
        try {
          const data = await startSession(action.instruction);
          if (data.sessionId) navigate(`/${data.sessionId}`);
          setStatus(data.message);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "Failed to start session.";
          setStatus(message);
          setLocalMessages((current) => [
            ...current,
            {
              id: `local-error-${Date.now()}`,
              role: "bot",
              content: `Could not start session: ${message}`,
              subtitle: "Request error",
              timestamp: new Date().toISOString(),
              variant: "error",
            },
          ]);
          setIsRunning(false);
        }
        return;
      }

      if (action.type === "continue") {
        const userMessage = createLocalUserMessage(action.instruction);
        setLocalMessages((current) => [...current, userMessage]);
        setIsRunning(true);
        setStatus("Restarting session from your new instruction...");
        try {
          const result = await resumeSession(action.sessionId, action.instruction);
          if (result.sessionId && result.sessionId !== action.sessionId) navigate(`/${result.sessionId}`);
          setStatus(result.message);
        } catch (error: unknown) {
          setStatus(error instanceof Error ? error.message : "Failed to continue session.");
          setIsRunning(false);
        }
        return;
      }

      setIsRunning(true);
      setStatus("Resuming session...");
      try {
        const result = await resumeSession(action.sessionId);
        if (result.sessionId && result.sessionId !== action.sessionId) navigate(`/${result.sessionId}`);
        setStatus(result.message);
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "Failed to resume session.");
        setIsRunning(false);
      }
    },
    [navigate, resumeSession, startSession],
  );

  const ensureReadyToRun = useCallback(
    async (action: PendingRunAction): Promise<boolean> => {
      const latest = readiness ?? (await loadReadiness());
      if (latest.canRunBot) {
        return true;
      }
      pendingRunRef.current = action;
      setStatus(latest.message ?? "Finish account setup before running the bot.");
      openOnboarding();
      return false;
    },
    [loadReadiness, openOnboarding, readiness],
  );

  const handleContinueInstruction = useCallback(
    async (instruction: string) => {
      if (!activeSessionId) return;
      if (!(await ensureReadyToRun({ type: "continue", sessionId: activeSessionId, instruction }))) {
        return;
      }
      await executePendingRun({ type: "continue", sessionId: activeSessionId, instruction });
    },
    [activeSessionId, ensureReadyToRun, executePendingRun],
  );

  const handleSendInstruction = useCallback(
    async (instruction: string) => {
      if (botSleeping && activeSessionId) {
        await handleContinueInstruction(instruction);
        return;
      }
      if (!(await ensureReadyToRun({ type: "start", instruction }))) {
        return;
      }
      await executePendingRun({ type: "start", instruction });
    },
    [activeSessionId, botSleeping, ensureReadyToRun, executePendingRun, handleContinueInstruction],
  );

  const handleStartFlow = useCallback(async () => {
    await handleSendInstruction(START_DISCOVERY_INSTRUCTION);
  }, [handleSendInstruction]);

  const handleFeedbackSubmit = useCallback(
    async (answer: {
      selectedOption?: string;
      selectedOptions?: string[];
      customText?: string;
      textAnswer?: string;
    }) => {
      if (!activeSessionId || !feedback) return;
      if (!(await ensureReadyToRun({ type: "resume", sessionId: activeSessionId }))) {
        return;
      }
      setFeedbackSubmitting(true);
      setIsRunning(true);
      try {
        const result = await submitFeedbackRequest(activeSessionId, answer);
        setStatus(result.message);
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "Failed to submit feedback.");
        setIsRunning(false);
      } finally {
        setFeedbackSubmitting(false);
      }
    },
    [activeSessionId, ensureReadyToRun, feedback],
  );

  const greeting = "Good to see you";

  useEffect(() => {
    if (!activeSessionId) return;
    fetchPendingFeedbackRequest(activeSessionId).catch(() => {});
  }, [activeSessionId]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );

  const lastRunFailed = useMemo(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event?.kind === "graph-run-complete") {
        return event.payload.failed === true;
      }
    }
    return false;
  }, [events]);

  const canResumeSession = Boolean(
    activeSession?.resume.canContinue &&
      activeSession.resume.mode === "continue" &&
      !isRunning &&
      !feedback,
  );

  const showResumeBanner = canResumeSession;

  const handleResumeSession = useCallback(async () => {
    if (!activeSessionId) return;
    if (!(await ensureReadyToRun({ type: "resume", sessionId: activeSessionId }))) {
      return;
    }
    setIsRunning(true);
    setStatus(activeSession?.resume.message ?? "Continuing session...");
    try {
      const result = await resumeSession(activeSessionId);
      setStatus(result.message);
    } catch (error: unknown) {
      setStatus(error instanceof Error ? error.message : "Failed to resume session.");
      setIsRunning(false);
    }
  }, [activeSession?.resume.message, activeSessionId, ensureReadyToRun, resumeSession]);

  useEffect(() => {
    if (!readiness?.canRunBot) {
      return;
    }
    const pending = pendingRunRef.current;
    if (!pending) {
      return;
    }
    pendingRunRef.current = null;
    void executePendingRun(pending);
  }, [executePendingRun, readiness?.canRunBot]);

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
        <ChatThread messages={messages} isRunning={isRunning && !feedback} greeting={greeting} />
        <AnimatePresence mode="popLayout">
          {feedback ? (
            <motion.div
              key={feedback.requestId}
              className="mt-2 md:mt-4"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22 }}
            >
              <FeedbackCard
                feedback={feedback}
                submitting={feedbackSubmitting}
                onSubmit={(answer) => {
                  void handleFeedbackSubmit(answer);
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <motion.div layout className="shrink-0 px-4 pb-safe pt-3 backdrop-blur md:border-transparent md:bg-transparent md:px-8 md:pb-4 dark:border-white/10 dark:bg-black/30 md:dark:bg-transparent">
        {!activeSessionId ? (
          <div className="mx-auto mb-4 w-full max-w-3xl rounded-2xl border border-slate-300/70 bg-white/90 p-4 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur dark:border-white/15 dark:bg-neutral-900/90 dark:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
            <p className="text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
              Start the flow to load 10 active markets, select one or more for Tavily research, then review the deterministic ranking before approving any trade.
            </p>
            {!settingsLoading && readiness && !readiness.canRunBot ? (
              <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                {readiness.message ?? "Configure your AI provider before starting."}
              </p>
            ) : null}
            <button
              type="button"
              className="mt-3 min-h-11 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              disabled={isRunning || settingsLoading}
              onClick={() => {
                void handleStartFlow();
              }}
            >
              {isRunning ? "Starting..." : "Start market flow"}
            </button>
          </div>
        ) : null}
        {showResumeBanner ? (
          <div className="mx-auto mb-4 w-full max-w-3xl rounded-2xl border border-amber-300/70 bg-amber-50/85 p-4 dark:border-amber-400/30 dark:bg-amber-950/30">
            <p className="text-sm text-amber-950 dark:text-amber-100">
              {lastRunFailed
                ? "This session stopped before finishing."
                : null}{" "}
              {activeSession?.resume.message ??
                "You can continue from the current workflow phase."}
            </p>
            {activeSession?.resume.phase ? (
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-800/80 dark:text-amber-200/80">
                Phase: {activeSession.resume.phase}
              </p>
            ) : null}
            <button
              type="button"
              className="mt-3 min-h-11 rounded-full bg-amber-900 px-5 py-2.5 text-sm font-medium text-amber-50 disabled:opacity-50 dark:bg-amber-100 dark:text-amber-950"
              disabled={isRunning || settingsLoading}
              onClick={() => {
                void handleResumeSession();
              }}
            >
              {isRunning ? "Continuing..." : "Continue session"}
            </button>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
