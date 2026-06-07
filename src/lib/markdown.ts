const TRAILING_EMPHASIS_RE = /(\*{1,2}|_{1,2})+$/;

export function normalizeMarkdownInput(input: string): string {
  let text = input.replace(/\r\n/g, "\n").trim();
  if (text.length === 0) {
    return "";
  }

  const fenceCount = (text.match(/```/g) ?? []).length;
  const needsFenceClose = fenceCount % 2 === 1;

  const doubleStars = (text.match(/\*\*/g) ?? []).length;
  if (doubleStars % 2 === 1) {
    text = text.replace(/\*\*([^*]*)$/, "$1");
  }

  text = text.replace(TRAILING_EMPHASIS_RE, "");

  if (needsFenceClose) {
    text += "\n```";
  }

  return text;
}

export function stripMarkdownForPreview(input: string, maxLength = 160): string {
  const plain = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }
  return `${plain.slice(0, maxLength - 1).trim()}…`;
}
