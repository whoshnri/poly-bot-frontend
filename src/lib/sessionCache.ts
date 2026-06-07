import type { SessionSummary } from "../types";

export type SessionsCacheEntry = {
  fetchedAt: number;
  sessions: SessionSummary[];
};

export type ActiveSessionCacheEntry = {
  sessionId: string;
  phase?: string;
  updatedAt: number;
};

export type PendingStartCacheEntry = {
  token: string;
  startedAt: number;
  sessionId?: string;
};

const SESSIONS_TTL_MS = 5 * 60 * 1000;

function sessionsKey(userId: string): string {
  return `pm:sessions:v1:${userId}`;
}

function activeSessionKey(userId: string): string {
  return `pm:activeSession:v1:${userId}`;
}

function pendingStartKey(userId: string): string {
  return `pm:pendingStart:v1:${userId}`;
}

function readJson<T>(key: string): T | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode errors.
  }
}

function removeKey(key: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function readSessionsCache(userId: string): SessionsCacheEntry | null {
  const entry = readJson<SessionsCacheEntry>(sessionsKey(userId));
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.fetchedAt > SESSIONS_TTL_MS) {
    return null;
  }
  return entry;
}

export function writeSessionsCache(userId: string, sessions: SessionSummary[]): void {
  writeJson(sessionsKey(userId), {
    fetchedAt: Date.now(),
    sessions,
  } satisfies SessionsCacheEntry);
}

export function upsertSessionInCache(userId: string, session: SessionSummary): void {
  const existing = readJson<SessionsCacheEntry>(sessionsKey(userId));
  const sessions = existing?.sessions ?? [];
  writeSessionsCache(userId, [session, ...sessions.filter((entry) => entry.id !== session.id)]);
}

export function removeSessionFromCache(userId: string, sessionId: string): void {
  const existing = readJson<SessionsCacheEntry>(sessionsKey(userId));
  if (!existing) {
    return;
  }
  writeSessionsCache(
    userId,
    existing.sessions.filter((entry) => entry.id !== sessionId),
  );
}

export function readActiveSessionCache(userId: string): ActiveSessionCacheEntry | null {
  return readJson<ActiveSessionCacheEntry>(activeSessionKey(userId));
}

export function writeActiveSessionCache(
  userId: string,
  entry: Omit<ActiveSessionCacheEntry, "updatedAt">,
): void {
  writeJson(activeSessionKey(userId), {
    ...entry,
    updatedAt: Date.now(),
  } satisfies ActiveSessionCacheEntry);
}

export function readPendingStart(userId: string): PendingStartCacheEntry | null {
  const entry = readJson<PendingStartCacheEntry>(pendingStartKey(userId));
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.startedAt > 30_000) {
    removeKey(pendingStartKey(userId));
    return null;
  }
  return entry;
}

export function writePendingStart(userId: string, token: string, sessionId?: string): void {
  writeJson(pendingStartKey(userId), {
    token,
    startedAt: Date.now(),
    sessionId,
  } satisfies PendingStartCacheEntry);
}

export function clearPendingStart(userId: string): void {
  removeKey(pendingStartKey(userId));
}

export function isPendingStartForSession(userId: string, sessionId: string): boolean {
  const pending = readPendingStart(userId);
  return Boolean(pending && (!pending.sessionId || pending.sessionId === sessionId));
}
