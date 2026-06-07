import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteSessionRequest,
  fetchSessionsRequest,
  resumeSessionRequest,
  startSessionRequest,
  type PreSessionPayload,
} from "../api/sessions";
import type { SessionSummary } from "../types";
import {
  clearPendingStart,
  readPendingStart,
  readSessionsCache,
  removeSessionFromCache,
  upsertSessionInCache,
  writeActiveSessionCache,
  writePendingStart,
  writeSessionsCache,
} from "../lib/sessionCache";

const START_DEBOUNCE_MS = 1500;

export function useSessions(userId: string | null) {
  const [sessions, setSessions] = useState<SessionSummary[]>(() => {
    if (!userId) {
      return [];
    }
    return readSessionsCache(userId)?.sessions ?? [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastStartAtRef = useRef(0);

  const loadSessions = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      return [];
    }

    setError(null);
    const nextSessions = await fetchSessionsRequest();
    setSessions(nextSessions);
    writeSessionsCache(userId, nextSessions);
    return nextSessions;
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const cached = readSessionsCache(userId);
    if (cached) {
      setSessions(cached.sessions);
      setLoading(false);
    }

    loadSessions()
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load sessions.");
      })
      .finally(() => setLoading(false));
  }, [loadSessions, userId]);

  const startSession = useCallback(
    async (instruction: string, preSession?: PreSessionPayload) => {
      if (!userId) {
        throw new Error("Sign in to start a session.");
      }

      const now = Date.now();
      if (now - lastStartAtRef.current < START_DEBOUNCE_MS) {
        throw new Error("Please wait a moment before starting another session.");
      }
      lastStartAtRef.current = now;

      const token = crypto.randomUUID();
      writePendingStart(userId, token);

      try {
        const data = await startSessionRequest(instruction, preSession);
        writePendingStart(userId, token, data.sessionId);
        writeActiveSessionCache(userId, { sessionId: data.sessionId });

        const optimistic: SessionSummary = {
          id: data.sessionId,
          name: data.name,
          createdAt: data.createdAt,
          updatedAt: data.createdAt,
          resume: {
            canContinue: false,
            mode: "idle",
            phase: preSession ? "RESEARCH" : "DISCOVER",
            message: "Session is starting…",
            justStarted: true,
          },
          latestStage: null,
        };
        upsertSessionInCache(userId, optimistic);
        setSessions((current) => [optimistic, ...current.filter((entry) => entry.id !== data.sessionId)]);

        void loadSessions();
        return data;
      } catch (error) {
        clearPendingStart(userId);
        throw error;
      }
    },
    [loadSessions, userId],
  );

  const clearPendingStartForUser = useCallback(() => {
    if (userId) {
      clearPendingStart(userId);
    }
  }, [userId]);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      await deleteSessionRequest(sessionId);
      if (userId) {
        removeSessionFromCache(userId, sessionId);
      }
      await loadSessions();
    },
    [loadSessions, userId],
  );

  const resumeSession = useCallback(
    async (sessionId: string, instruction?: string) => {
      const data = await resumeSessionRequest(sessionId, instruction);
      if (userId) {
        writeActiveSessionCache(userId, { sessionId: data.sessionId });
      }
      await loadSessions();
      return data;
    },
    [loadSessions, userId],
  );

  const pendingStart = userId ? readPendingStart(userId) : null;

  return {
    sessions,
    loading,
    error,
    loadSessions,
    startSession,
    resumeSession,
    deleteSession,
    pendingStart,
    clearPendingStartForUser,
  };
}
