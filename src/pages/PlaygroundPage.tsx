import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { submitFeedbackRequest, fetchPendingFeedbackRequest } from "../api/sessions";
import { useAuth } from "../hooks/useAuth";
import { useEventStream } from "../hooks/useEventStream";
import { useOnboarding } from "../hooks/useOnboarding";
import { useSettings } from "../hooks/useSettings";
import type { ChatMessageItem } from "../types";
import { useShellStatus } from "../hooks/useShellStatus";
import {
  buildChatView,
  createLocalUserMessage,
  hasInFlightGraphRun,
  isBotSleeping,
  pendingFeedbackToRequestItem,
} from "../lib/chatView";
import { isPendingStartForSession } from "../lib/sessionCache";
import { ChatThread } from "../components/ChatThread";
import { PromptComposer } from "../components/PromptComposer";
import { WorkflowPhaseStepper } from "../components/WorkflowPhaseStepper";
import { useShellContext } from "./LoginPage";

type PendingRunAction =
  | { type: "resume"; sessionId: string }
  | { type: "continue"; sessionId: string; instruction: string };

export function PlaygroundPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sessions, loadSessions, resumeSession, clearPendingStartForUser } = useShellContext();
  const { readiness, loading: settingsLoading, loadReadiness } = useSettings();
  const { openOnboarding } = useOnboarding();
  const { setStatus: setShellStatus } = useShellStatus();
  const activeSessionId = sessionId ?? null;
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<ReturnType<typeof pendingFeedbackToRequestItem> | null>(null);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const pendingRunRef = useRef<PendingRunAction | null>(null);
  const autoResumedRef = useRef<string | null>(null);
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

  const { messages, feedback: streamFeedback } = useMemo(
    () => buildChatView(events, localMessages),
    [events, localMessages],
  );
  const feedback = streamFeedback ?? apiFeedback;
  const botSleeping = useMemo(() => isBotSleeping(events), [events]);

  useEffect(() => {
    setShellStatus(status);
  }, [setShellStatus, status]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, feedback, isRunning]);

  useEffect(() => {
    resetEvents();
    setLocalMessages([]);
    setIsRunning(false);
    setApiFeedback(null);
    setFeedbackDismissed(false);
    autoResumedRef.current = null;
  }, [activeSessionId, resetEvents]);

  useEffect(() => {
    if (!activeSessionId || !user?.userId) {
      return;
    }

    const started = events.some((event) => event.kind === "graph-run-start");
    if (started) {
      clearPendingStartForUser();
    }
  }, [activeSessionId, clearPendingStartForUser, events, user?.userId]);

  const executePendingRun = useCallback(
    async (action: PendingRunAction) => {
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
    [navigate, resumeSession],
  );

  const ensureReadyToRun = useCallback(
    async (action: PendingRunAction): Promise<boolean> => {
      try {
        const latest = readiness ?? (await loadReadiness());
        if (latest.canRunBot) {
          return true;
        }
        pendingRunRef.current = action;
        setStatus(latest.message ?? "Finish account setup before running the bot.");
        openOnboarding();
        return false;
      } catch (error: unknown) {
        setStatus(error instanceof Error ? error.message : "Failed to verify account setup.");
        return false;
      }
    },
    [loadReadiness, openOnboarding, readiness],
  );

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
        setApiFeedback(null);
        setFeedbackDismissed(false);
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
    if (!activeSessionId) {
      return;
    }

    fetchPendingFeedbackRequest(activeSessionId)
      .then(({ pending }) => {
        if (pending) {
          setApiFeedback(pendingFeedbackToRequestItem(pending));
        } else {
          setApiFeedback(null);
        }
      })
      .catch(() => {});
  }, [activeSessionId]);

  useEffect(() => {
    if (streamFeedback) {
      setApiFeedback(null);
      setFeedbackDismissed(false);
    }
  }, [streamFeedback]);

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

  const suppressResume = Boolean(
    user?.userId &&
      activeSessionId &&
      (isPendingStartForSession(user.userId, activeSessionId) ||
        activeSession?.resume.justStarted),
  );

  const canResumeSession = Boolean(
    activeSession?.resume.canContinue &&
      activeSession.resume.mode === "continue" &&
      !isRunning &&
      !feedback &&
      !suppressResume,
  );

  const showResumeBanner = canResumeSession;

  const showComposer = Boolean(
    activeSessionId &&
      !feedback &&
      !isRunning &&
      !suppressResume &&
      !settingsLoading &&
      (botSleeping ||
        activeSession?.resume.mode === "sleeping" ||
        (activeSession?.resume.mode === "idle" && !activeSession.resume.justStarted)),
  );

  const handleComposerSubmit = useCallback(
    (instruction: string) => {
      if (!activeSessionId) {
        return;
      }
      void ensureReadyToRun({
        type: "continue",
        sessionId: activeSessionId,
        instruction,
      }).then((ready) => {
        if (!ready) {
          return;
        }
        void executePendingRun({
          type: "continue",
          sessionId: activeSessionId,
          instruction,
        });
      });
    },
    [activeSessionId, ensureReadyToRun, executePendingRun],
  );

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

  useEffect(() => {
    if (!activeSessionId || !activeSession || !readiness?.canRunBot) {
      return;
    }
    if (autoResumedRef.current === activeSessionId) {
      return;
    }
    if (
      activeSession.resume.mode !== "continue" ||
      !activeSession.resume.canContinue ||
      suppressResume ||
      isRunning ||
      feedback ||
      apiFeedback ||
      hasInFlightGraphRun(events)
    ) {
      return;
    }

    autoResumedRef.current = activeSessionId;
    void (async () => {
      if (!(await ensureReadyToRun({ type: "resume", sessionId: activeSessionId }))) {
        autoResumedRef.current = null;
        return;
      }
      setIsRunning(true);
      setStatus(activeSession.resume.message ?? "Continuing session...");
      try {
        const result = await resumeSession(activeSessionId);
        setStatus(result.message);
      } catch (error: unknown) {
        autoResumedRef.current = null;
        setStatus(error instanceof Error ? error.message : "Failed to resume session.");
        setIsRunning(false);
      }
    })();
  }, [
    activeSession,
    activeSessionId,
    ensureReadyToRun,
    events,
    feedback,
    isRunning,
    readiness?.canRunBot,
    apiFeedback,
    resumeSession,
    suppressResume,
  ]);

  useEffect(() => {
    if (!activeSessionId) {
      navigate("/", { replace: true });
    }
  }, [activeSessionId, navigate]);

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
        {activeSession?.resume.phase ? (
          <WorkflowPhaseStepper
            phase={activeSession.resume.phase}
            skippedDiscover={activeSession.hasPreSession}
          />
        ) : null}
        <ChatThread
          messages={messages}
          isRunning={isRunning && !feedback}
          greeting={greeting}
          feedback={feedback}
          feedbackDismissed={feedbackDismissed}
          feedbackSubmitting={feedbackSubmitting}
          onFeedbackDismiss={() => setFeedbackDismissed(true)}
          onFeedbackRestore={() => setFeedbackDismissed(false)}
          onFeedbackSubmit={(answer) => {
            void handleFeedbackSubmit(answer);
          }}
        />
      </motion.div>

      <motion.div layout className="shrink-0 px-4 pb-safe pt-3 backdrop-blur md:border-transparent md:bg-transparent md:px-8 md:pb-4 dark:border-white/10 dark:bg-black/30 md:dark:bg-transparent">
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
        {showComposer ? (
          <PromptComposer
            disabled={isRunning || settingsLoading}
            placeholder={
              botSleeping || activeSession?.resume.mode === "sleeping"
                ? "Send a new instruction to wake the bot or pivot…"
                : "Tell the bot what to research or how to act…"
            }
            onSubmit={handleComposerSubmit}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
