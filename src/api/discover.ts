import { apiRequest } from "./client";
import type { DiscoverMarketOption } from "../lib/preSessionDraft";

export type DiscoverChatMessage = {
  role: "user" | "bot";
  content: string;
};

export type DiscoverChatResponse = {
  reply: string;
  topic?: string;
  queries?: string[];
  readyToSearch: boolean;
};

export type DiscoverRunResponse = {
  topic: string;
  queries: string[];
  markets: DiscoverMarketOption[];
};

export async function discoverChatRequest(messages: DiscoverChatMessage[]) {
  const data = await apiRequest<DiscoverChatResponse>("/api/discover/chat", {
    method: "POST",
    body: { messages },
  });
  const { success: _success, ...result } = data;
  return result;
}

export async function discoverRunRequest(input: {
  topic: string;
  queries?: string[];
  limit?: number;
}) {
  const data = await apiRequest<DiscoverRunResponse>("/api/discover/run", {
    method: "POST",
    body: input,
  });
  const { success: _success, ...result } = data;
  return result;
}
