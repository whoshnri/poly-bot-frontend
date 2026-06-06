import { useCallback, useEffect, useRef, useState } from "react";
import { getEventStreamUrl } from "../api/client";
import type { BotUiEvent } from "../types";

type UseEventStreamOptions = {
  sessionId: string | null;
  onStatus: (message: string) => void;
  onRunFinished: () => void;
};

const RECONNECT_DELAY_MS = 1500;

function safeParseEvent(data: string): BotUiEvent | null {
  try {
    return JSON.parse(data) as BotUiEvent;
  } catch {
    return null;
  }
}

export function useEventStream({ sessionId, onStatus, onRunFinished }: UseEventStreamOptions) {
  const [events, setEvents] = useState<BotUiEvent[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const onStatusRef = useRef(onStatus);
  const onRunFinishedRef = useRef(onRunFinished);

  onStatusRef.current = onStatus;
  onRunFinishedRef.current = onRunFinished;

  const resetEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (!sessionId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed) {
        return;
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const source = new EventSource(getEventStreamUrl(sessionId), { withCredentials: true });
      eventSourceRef.current = source;

      source.onopen = () => {
        onStatusRef.current(`Live stream connected for ${sessionId.slice(0, 8)}…`);
      };

      source.onmessage = (message: MessageEvent<string>) => {
        const parsed = safeParseEvent(message.data);
        if (!parsed) {
          return;
        }

        setEvents((current) => {
          if (current.some((entry) => entry.id === parsed.id)) {
            return current;
          }
          return [...current, parsed];
        });

        if (
          parsed.kind === "graph-run-complete" ||
          parsed.kind === "graph-run-error" ||
          parsed.kind === "bot-sleep"
        ) {
          onRunFinishedRef.current();
        }
      };

      source.onerror = () => {
        source.close();
        if (eventSourceRef.current === source) {
          eventSourceRef.current = null;
        }
        if (disposed) {
          return;
        }
        onStatusRef.current(`Stream reconnecting for ${sessionId.slice(0, 8)}…`);
        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [sessionId]);

  return { events, resetEvents };
}
