import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError } from "../api/client";
import {
  fetchRunReadinessRequest,
  fetchSettingsRequest,
  updateSettingsRequest,
  type AiProviderOption,
  type RunReadiness,
  type UpdateSettingsInput,
  type UserSettings,
} from "../api/settings";

type SettingsContextValue = {
  settings: UserSettings | null;
  readiness: RunReadiness | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  loadSettings: () => Promise<UserSettings>;
  loadReadiness: () => Promise<RunReadiness>;
  saveSettings: (input: UpdateSettingsInput) => Promise<UserSettings>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [readiness, setReadiness] = useState<RunReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setError(null);
    const nextSettings = await fetchSettingsRequest();
    setSettings(nextSettings);
    setReadiness(nextSettings.readiness);
    return nextSettings;
  }, []);

  const loadReadiness = useCallback(async () => {
    try {
      const nextReadiness = await fetchRunReadinessRequest();
      setReadiness(nextReadiness);
      setSettings((current) => (current ? { ...current, readiness: nextReadiness } : current));
      return nextReadiness;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        throw err;
      }
      const message = err instanceof Error ? err.message : "Failed to load readiness.";
      setError(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadSettings()
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          setError("Session expired. Sign in again.");
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load settings.");
      })
      .finally(() => setLoading(false));
  }, [loadSettings]);

  const saveSettings = useCallback(async (input: UpdateSettingsInput) => {
    setSaving(true);
    setError(null);
    try {
      const nextSettings = await updateSettingsRequest(input);
      setSettings(nextSettings);
      setReadiness(nextSettings.readiness);
      return nextSettings;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save settings.";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      readiness,
      loading,
      saving,
      error,
      loadSettings,
      loadReadiness,
      saveSettings,
    }),
    [settings, readiness, loading, saving, error, loadSettings, loadReadiness, saveSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within SettingsProvider.");
  }
  return context;
}

export type { AiProviderOption, RunReadiness, UpdateSettingsInput, UserSettings };
