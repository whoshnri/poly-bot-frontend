import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { AiProviderOption, RunReadiness, UpdateSettingsInput, UserSettings } from "../hooks/useSettings";

type OnboardingStep = 1 | 2 | 3;

type OnboardingModalProps = {
  open: boolean;
  settings: UserSettings | null;
  readiness: RunReadiness | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (input: UpdateSettingsInput) => Promise<UserSettings>;
};

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100";

function resolveInitialStep(readiness: RunReadiness | null): OnboardingStep {
  if (!readiness) {
    return 1;
  }
  if (!readiness.requiredSteps.botConfig) {
    return 1;
  }
  if (!readiness.requiredSteps.aiConfig) {
    return 2;
  }
  return 1;
}

function stepLabel(step: OnboardingStep): string {
  switch (step) {
    case 1:
      return "Trade guardrails";
    case 2:
      return "AI provider";
    case 3:
      return "Polymarket API";
  }
}

export function OnboardingModal({
  open,
  settings,
  readiness,
  saving,
  error,
  onClose,
  onSave,
}: OnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [localError, setLocalError] = useState<string | null>(null);

  const [maxOrderSizeUsdc, setMaxOrderSizeUsdc] = useState(100);
  const [maxExposureUsdc, setMaxExposureUsdc] = useState(500);
  const [minPrice, setMinPrice] = useState(0.01);
  const [maxPrice, setMaxPrice] = useState(0.99);
  const [dryRun, setDryRun] = useState(true);

  const [aiApiProvider, setAiApiProvider] = useState<AiProviderOption["id"]>("gemini");
  const [aiApiKey, setAiApiKey] = useState("");

  const [polymarketApiKey, setPolymarketApiKey] = useState("");
  const [polymarketApiSecret, setPolymarketApiSecret] = useState("");

  const providerOptions = readiness?.aiProviders ?? [];
  const hasAiApiKey = settings?.userConfig?.hasAiApiKey ?? false;

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep(resolveInitialStep(readiness));
    setLocalError(null);
    setAiApiKey("");
    setPolymarketApiKey("");
    setPolymarketApiSecret("");

    if (settings) {
      setMaxOrderSizeUsdc(settings.botConfig.maxOrderSizeUsdc);
      setMaxExposureUsdc(settings.botConfig.maxExposureUsdc);
      setMinPrice(settings.botConfig.minPrice);
      setMaxPrice(settings.botConfig.maxPrice);
      setDryRun(settings.botConfig.dryRun);
      if (settings.userConfig?.aiApiProvider) {
        setAiApiProvider(settings.userConfig.aiApiProvider);
      } else if (providerOptions[0]) {
        setAiApiProvider(providerOptions[0].id);
      }
    }
  }, [open, readiness, settings, providerOptions]);

  const completedSteps = useMemo(
    () => ({
      botConfig: readiness?.requiredSteps.botConfig ?? false,
      aiConfig: readiness?.requiredSteps.aiConfig ?? false,
    }),
    [readiness],
  );

  if (!open) {
    return null;
  }

  async function persistStep(input: UpdateSettingsInput, nextStep?: OnboardingStep) {
    setLocalError(null);
    try {
      const nextSettings = await onSave(input);
      if (nextSettings.readiness.onboardingCompleted) {
        onClose();
        return;
      }
      if (nextStep) {
        setStep(nextStep);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : "Failed to save setup.");
    }
  }

  async function handleStepSave(continueToApp: boolean) {
    if (step === 1) {
      await persistStep(
        {
          botConfig: { maxOrderSizeUsdc, maxExposureUsdc, minPrice, maxPrice, dryRun },
        },
        continueToApp ? undefined : 2,
      );
      return;
    }

    if (step === 2) {
      if (!aiApiKey.trim() && !hasAiApiKey) {
        setLocalError("Add an AI API key to continue.");
        return;
      }

      await persistStep(
        {
          userConfig: {
            aiApiProvider,
            ...(aiApiKey.trim() ? { aiApiKey: aiApiKey.trim() } : {}),
          },
        },
        continueToApp ? undefined : 3,
      );
      return;
    }

    await persistStep({
      userConfig: {
        ...(polymarketApiKey.trim() ? { polymarketApiKey: polymarketApiKey.trim() } : {}),
        ...(polymarketApiSecret.trim() ? { polymarketApiSecret: polymarketApiSecret.trim() } : {}),
      },
    });
  }

  const displayError = localError ?? error;

  return (
    <motion.div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4 dark:bg-black/60"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="max-h-[min(92dvh,820px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-300 bg-white p-5 pb-safe sm:p-6 dark:border-white/15 dark:bg-neutral-950"
        initial={{ y: 14, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
      >
        <p className="text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-neutral-400">
          Account setup · Step {step} of 3
        </p>
        <h2 className="mt-2 text-lg font-medium text-slate-900 dark:text-neutral-100">{stepLabel(step)}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          {step === 1
            ? "Review trade guardrails. Defaults are fine to start — you can change these anytime in Settings."
            : step === 2
              ? "Connect the AI model that powers market research and decisions. Keys are encrypted and never shown again."
              : "Optional Polymarket credentials for live trading. Skip this if you are staying in dry-run mode."}
        </p>

        <div className="mt-4 flex gap-2">
          {[1, 2, 3].map((entry) => {
            const stepNumber = entry as OnboardingStep;
            const isActive = step === stepNumber;
            const isDone =
              (stepNumber === 1 && completedSteps.botConfig) ||
              (stepNumber === 2 && completedSteps.aiConfig) ||
              (stepNumber === 3 && (settings?.userConfig?.hasPolymarketApiKey ?? false));

            return (
              <div
                key={entry}
                className={`h-1.5 flex-1 rounded-full ${
                  isActive
                    ? "bg-slate-900 dark:bg-neutral-100"
                    : isDone
                      ? "bg-emerald-500/80"
                      : "bg-slate-200 dark:bg-white/10"
                }`}
              />
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          {step === 1 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-neutral-300">
                  Max order size (USDC)
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    value={maxOrderSizeUsdc}
                    onChange={(event) => setMaxOrderSizeUsdc(Number(event.target.value))}
                  />
                </label>
                <label className="block text-sm text-slate-700 dark:text-neutral-300">
                  Max exposure (USDC)
                  <input
                    className={fieldClass}
                    type="number"
                    min={1}
                    value={maxExposureUsdc}
                    onChange={(event) => setMaxExposureUsdc(Number(event.target.value))}
                  />
                </label>
                <label className="block text-sm text-slate-700 dark:text-neutral-300">
                  Min price
                  <input
                    className={fieldClass}
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={minPrice}
                    onChange={(event) => setMinPrice(Number(event.target.value))}
                  />
                </label>
                <label className="block text-sm text-slate-700 dark:text-neutral-300">
                  Max price
                  <input
                    className={fieldClass}
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(Number(event.target.value))}
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
                <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
                Dry-run mode (recommended until Polymarket keys are added)
              </label>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <label className="block text-sm text-slate-700 dark:text-neutral-300">
                Provider
                <select
                  className={fieldClass}
                  value={aiApiProvider}
                  onChange={(event) => setAiApiProvider(event.target.value as AiProviderOption["id"])}
                >
                  {providerOptions.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-700 dark:text-neutral-300">
                API key
                <input
                  className={fieldClass}
                  type="password"
                  value={aiApiKey}
                  onChange={(event) => setAiApiKey(event.target.value)}
                  placeholder={hasAiApiKey ? "•••••••• (saved — leave blank to keep)" : "Paste your provider API key"}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <label className="block text-sm text-slate-700 dark:text-neutral-300">
                Polymarket API key
                <input
                  className={fieldClass}
                  type="password"
                  value={polymarketApiKey}
                  onChange={(event) => setPolymarketApiKey(event.target.value)}
                  placeholder={settings?.userConfig?.hasPolymarketApiKey ? "••••••••" : "Optional"}
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm text-slate-700 dark:text-neutral-300">
                Polymarket API secret
                <input
                  className={fieldClass}
                  type="password"
                  value={polymarketApiSecret}
                  onChange={(event) => setPolymarketApiSecret(event.target.value)}
                  placeholder={settings?.userConfig?.hasPolymarketApiSecret ? "••••••••" : "Optional"}
                  autoComplete="off"
                />
              </label>
            </>
          ) : null}
        </div>

        {displayError ? <p className="mt-4 text-sm text-red-500 dark:text-red-300">{displayError}</p> : null}

        <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-neutral-500">
          Required: trade guardrails and an AI provider key. You can save partial progress and finish later in Settings
          — this setup prompt will appear again after login until required steps are complete.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {step > 1 ? (
              <button
                type="button"
                className="min-h-11 rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-700 dark:border-white/20 dark:text-neutral-200"
                onClick={() => setStep((current) => (current > 1 ? ((current - 1) as OnboardingStep) : current))}
                disabled={saving}
              >
                Back
              </button>
            ) : null}
            {step === 3 ? (
              <button
                type="button"
                className="min-h-11 rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-700 dark:border-white/20 dark:text-neutral-200"
                onClick={() => {
                  void handleStepSave(true);
                }}
                disabled={saving}
              >
                Skip for now
              </button>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              className="min-h-11 rounded-full border border-slate-300 px-4 py-2.5 text-sm text-slate-700 dark:border-white/20 dark:text-neutral-200"
              onClick={() => {
                void handleStepSave(true);
              }}
              disabled={saving}
            >
              Save &amp; continue to app
            </button>
            <button
              type="button"
              className="min-h-11 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
              onClick={() => {
                void handleStepSave(false);
              }}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : step === 3
                  ? readiness?.onboardingCompleted
                    ? "Save & finish"
                    : "Save step"
                  : "Save & continue"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
