const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";


export type ApiErrorBody = {
  success: false;
  error: string;
  details?: string;
};

export type ApiSuccessBody<T extends Record<string, unknown> = Record<string, unknown>> = {
  success: true;
} & T;

export class ApiError extends Error {
  readonly status: number;
  readonly success = false as const;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function apiRequest<T extends Record<string, unknown>>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiSuccessBody<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload: unknown = isJson ? await response.json() : null;

  if (!isRecord(payload) || typeof payload.success !== "boolean") {
    throw new ApiError(response.status, `Invalid API response (${response.status}).`);
  }

  if (!payload.success) {
    const message =
      typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  if (!response.ok) {
    throw new ApiError(response.status, `Request failed (${response.status}).`);
  }

  return payload as ApiSuccessBody<T>;
}

export function getEventStreamUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/sessions/${sessionId}/events`;
}
