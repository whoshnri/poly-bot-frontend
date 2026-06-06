import { apiRequest } from "./client";

export type AiProviderOption = {
  id: "gemini" | "claude" | "deepseek";
  label: string;
};

export type RunReadiness = {
  hasBotConfig: boolean;
  hasAiConfig: boolean;
  canRunBot: boolean;
  onboardingCompleted: boolean;
  message: string | null;
  aiProviders: AiProviderOption[];
  requiredSteps: {
    botConfig: boolean;
    aiConfig: boolean;
  };
};

export type UserSettings = {
  userId: string;
  preferences: unknown;
  botConfig: {
    maxOrderSizeUsdc: number;
    maxExposureUsdc: number;
    allowedSides: string[];
    minPrice: number;
    maxPrice: number;
    dryRun: boolean;
  };
  userConfig: {
    id: string;
    polymarketApiKey: string | null;
    polymarketApiSecret: string | null;
    aiApiProvider: AiProviderOption["id"] | null;
    aiApiKey: string | null;
    hasPolymarketApiKey: boolean;
    hasPolymarketApiSecret: boolean;
    hasAiApiKey: boolean;
    hasAiConfig: boolean;
    updatedAt: string;
  } | null;
  readiness: RunReadiness;
};

export type UpdateSettingsInput = {
  botConfig?: Partial<UserSettings["botConfig"]>;
  userConfig?: {
    polymarketApiKey?: string | null;
    polymarketApiSecret?: string | null;
    aiApiKey?: string | null;
    aiApiProvider?: AiProviderOption["id"] | null;
  };
};

export async function fetchSettingsRequest() {
  const { success: _success, ...settings } = await apiRequest<UserSettings>("/api/settings");
  return settings;
}

export async function fetchRunReadinessRequest() {
  const { success: _success, ...readiness } = await apiRequest<RunReadiness>("/api/settings/readiness");
  return readiness;
}

export async function updateSettingsRequest(input: UpdateSettingsInput) {
  const { success: _success, ...settings } = await apiRequest<UserSettings>("/api/settings", {
    method: "PUT",
    body: input,
  });
  return settings;
}
