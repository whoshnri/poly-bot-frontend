import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessageItem, FeedbackRequestItem } from "../types";
import { formatDate } from "../lib/chatView";
import { ChatMessageBody } from "./ChatMessageBody";
import { FeedbackCard } from "./FeedbackCard";

type ChatThreadProps = {
  messages: ChatMessageItem[];
  isRunning: boolean;
  greeting: string;
  emptyDescription?: string;
  showTimestamps?: boolean;
  feedback?: FeedbackRequestItem | null;
  feedbackDismissed?: boolean;
  feedbackSubmitting?: boolean;
  feedbackSubmitLabel?: string;
  onFeedbackDismiss?: () => void;
  onFeedbackRestore?: () => void;
  onFeedbackSubmit?: (answer: {
    selectedOption?: string;
    selectedOptions?: string[];
    customText?: string;
    textAnswer?: string;
  }) => void;
};

export function ChatThread({
  messages,
  isRunning,
  greeting,
  emptyDescription = "Your instruction starts a session. The bot will plan, research, ask for input when needed, then trade or wait.",
  showTimestamps = true,
  feedback,
  feedbackDismissed = false,
  feedbackSubmitting = false,
  feedbackSubmitLabel,
  onFeedbackDismiss,
  onFeedbackRestore,
  onFeedbackSubmit,
}: ChatThreadProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-3xl flex-col gap-4 md:gap-5"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {messages.length === 0 ? (
        <div className="px-2 pt-[8dvh] text-center md:px-0 md:pt-[12vh]">
          <p className="serif-display text-3xl text-slate-700 dark:text-neutral-200 sm:text-4xl md:text-5xl">
            {greeting}
          </p>
          <p className="mx-auto mt-3 max-w-xl px-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400 md:mt-4 md:px-0">
            {emptyDescription}
          </p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.article
              key={message.id}
              initial={{ opacity: 0, y: 10, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className={`${
                message.role === "user"
                  ? "ml-auto w-fit max-w-[min(88%,20rem)] rounded-2xl bg-slate-200/80 px-3.5 py-2.5 dark:bg-white/10 sm:px-4 sm:py-3"
                  : "w-full rounded-2xl border border-slate-300/70 bg-white/75 px-3.5 py-3 shadow-sm dark:border-white/10 dark:bg-white/5 sm:px-4"
              } ${
                message.variant === "error"
                  ? "border border-red-300/35 bg-red-200/40 dark:bg-red-300/10"
                  : ""
              } ${message.variant === "sleep" ? "border border-amber-300/35 bg-amber-300/10" : ""}`}
            >
              <ChatMessageBody message={message} />

              {showTimestamps ? (
                <header
                  className={`mt-2 flex gap-3 text-[11px] text-slate-500 dark:text-neutral-500 ${message.role === "user" ? "justify-end" : ""}`}
                >
                  <time dateTime={message.timestamp}>{formatDate(message.timestamp)}</time>
                </header>
              ) : null}
            </motion.article>
          ))}
        </AnimatePresence>
      )}
      {isRunning ? (
        <div className="inline-flex items-center gap-2 px-1 py-1 text-sm text-slate-500 dark:text-neutral-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500 dark:bg-neutral-500" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500 dark:bg-neutral-500 [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-500 dark:bg-neutral-500 [animation-delay:240ms]" />
          <span>Working...</span>
        </div>
      ) : null}
      <AnimatePresence mode="popLayout">
        {feedback && feedbackDismissed ? (
          <motion.button
            key={`${feedback.requestId}-hidden`}
            type="button"
            className="mr-auto max-w-[92%] rounded-2xl border border-dashed border-slate-300/80 bg-white/70 px-4 py-3 text-left text-sm text-slate-600 hover:bg-white dark:border-white/15 dark:bg-black/20 dark:text-neutral-300 dark:hover:bg-black/30"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={onFeedbackRestore}
          >
            Question hidden — tap to show again
          </motion.button>
        ) : null}
        {feedback && !feedbackDismissed && onFeedbackSubmit ? (
          <motion.div
            key={feedback.requestId}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <FeedbackCard
              feedback={feedback}
              submitting={feedbackSubmitting}
              submitLabel={feedbackSubmitLabel}
              onDismiss={onFeedbackDismiss}
              onSubmit={onFeedbackSubmit}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
