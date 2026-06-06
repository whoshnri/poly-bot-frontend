import { apiRequest } from "./client";
import type {
  PendingFeedback,
  ResumeSessionResponse,
  SessionSummary,
  StartSessionResponse,
} from "../types";

export async function fetchSessionsRequest() {
  const data = await apiRequest<{ sessions: SessionSummary[] }>("/api/sessions");
  return data.sessions;
}

export async function startSessionRequest(instruction: string) {
  const data = await apiRequest<StartSessionResponse>("/api/sessions/start", {
    method: "POST",
    body: { instruction },
  });
  const { success: _success, ...session } = data;
  return session;
}

export async function resumeSessionRequest(sessionId: string, instruction?: string) {
  const data = await apiRequest<ResumeSessionResponse>(`/api/sessions/${sessionId}/resume`, {
    method: "POST",
    body: instruction ? { instruction } : {},
  });
  const { success: _success, ...session } = data;
  return session;
}

export async function fetchSessionResumeRequest(sessionId: string) {
  const data = await apiRequest<{ resume: SessionSummary["resume"] }>(
    `/api/sessions/${sessionId}/resume`,
  );
  return data.resume;
}

export async function deleteSessionRequest(sessionId: string) {
  return apiRequest<{ sessionId: string; deleted: boolean }>(`/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
}

export async function fetchPendingFeedbackRequest(sessionId: string) {
  const data = await apiRequest<{ pending: PendingFeedback | null }>(
    `/api/sessions/${sessionId}/feedback/pending`,
  );
  return { pending: data.pending };
}

export async function submitFeedbackRequest(
  sessionId: string,
  answer: {
    selectedOption?: string;
    selectedOptions?: string[];
    customText?: string;
    textAnswer?: string;
  },
) {
  const data = await apiRequest<{ sessionId: string; formattedAnswer: string; message: string }>(
    `/api/sessions/${sessionId}/feedback`,
    {
      method: "POST",
      body: answer,
    },
  );
  const { success: _success, ...result } = data;
  return result;
}
