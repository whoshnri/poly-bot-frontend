import { useCallback, useEffect, useState } from "react";
import {
  deleteSessionRequest,
  fetchSessionsRequest,
  resumeSessionRequest,
  startSessionRequest,
} from "../api/sessions";
import type { SessionSummary } from "../types";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setError(null);
    const nextSessions = await fetchSessionsRequest();
    setSessions(nextSessions);
    return nextSessions;
  }, []);

  useEffect(() => {
    loadSessions()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load sessions.");
      })
      .finally(() => setLoading(false));
  }, [loadSessions]);

  const startSession = useCallback(
    async (instruction: string) => {
      const data = await startSessionRequest(instruction);
      await loadSessions();
      return data;
    },
    [loadSessions],
  );

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSessionRequest(sessionId);
      await loadSessions();
    },
    [loadSessions],
  );

  const resumeSession = useCallback(
    async (sessionId: string, instruction?: string) => {
      const data = await resumeSessionRequest(sessionId, instruction);
      await loadSessions();
      return data;
    },
    [loadSessions],
  );

  return {
    sessions,
    loading,
    error,
    loadSessions,
    startSession,
    resumeSession,
    deleteSession,
  };
}
