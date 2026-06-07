import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdownInput } from "../lib/markdown";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const normalized = normalizeMarkdownInput(content);
  if (!normalized) {
    return null;
  }

  return (
    <div
      className={
        className ??
        "prose prose-sm max-w-none break-words text-slate-800 prose-headings:font-semibold prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 dark:prose-invert dark:text-neutral-100"
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{normalized}</ReactMarkdown>
    </div>
  );
}
