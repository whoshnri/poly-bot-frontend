import { useState } from "react";

type PromptComposerProps = {
  disabled: boolean;
  placeholder?: string;
  onSubmit: (instruction: string) => void;
};

export function PromptComposer({
  disabled,
  placeholder = "Tell the bot what to research and how to act on Polymarket…",
  onSubmit,
}: PromptComposerProps) {
  const [instruction, setInstruction] = useState("");

  return (
    <form
      className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-300/70 bg-white/90 p-3 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur sm:p-4 dark:border-white/15 dark:bg-neutral-900/90 dark:shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = instruction.trim();
        if (!trimmed || disabled) {
          return;
        }
        onSubmit(trimmed);
        setInstruction("");
      }}
    >
      <label className="sr-only" htmlFor="instruction-input">
        Your instruction
      </label>
      <textarea
        id="instruction-input"
        className="min-h-[5.5rem] w-full resize-none rounded-xl border border-transparent bg-transparent px-2 py-2 text-base leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 sm:min-h-24 sm:px-3 dark:text-neutral-100 dark:placeholder:text-neutral-500"
        rows={3}
        placeholder={placeholder}
        value={instruction}
        disabled={disabled}
        onChange={(event) => setInstruction(event.target.value)}
      />
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="hidden text-xs text-slate-500 sm:inline dark:text-neutral-500">
          Research + plan before acting
        </span>
        <button
          type="submit"
          className="ml-auto min-h-11 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          disabled={disabled || !instruction.trim()}
        >
          Send
        </button>
      </div>
    </form>
  );
}
