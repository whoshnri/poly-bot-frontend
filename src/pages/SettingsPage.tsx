import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useSettings } from "../hooks/useSettings";
import { useOnboarding } from "../hooks/useOnboarding";

export function SettingsPage() {
  const { settings, loading, saving, error, saveSettings, readiness } = useSettings();
  const { openOnboarding } = useOnboarding();
  const [status, setStatus] = useState<string | null>(null);

  const [maxOrderSizeUsdc, setMaxOrderSizeUsdc] = useState(100);
  const [maxExposureUsdc, setMaxExposureUsdc] = useState(500);
  const [minPrice, setMinPrice] = useState(0.01);
  const [maxPrice, setMaxPrice] = useState(0.99);
  const [dryRun, setDryRun] = useState(true);
  const [polymarketApiKey, setPolymarketApiKey] = useState("");
  const [polymarketApiSecret, setPolymarketApiSecret] = useState("");
  const [aiApiProvider, setAiApiProvider] = useState<"gemini" | "claude" | "deepseek">("gemini");
  const [aiApiKey, setAiApiKey] = useState("");

  useEffect(() => {
    if (!settings) return;
    setMaxOrderSizeUsdc(settings.botConfig.maxOrderSizeUsdc);
    setMaxExposureUsdc(settings.botConfig.maxExposureUsdc);
    setMinPrice(settings.botConfig.minPrice);
    setMaxPrice(settings.botConfig.maxPrice);
    setDryRun(settings.botConfig.dryRun);
    if (settings.userConfig?.aiApiProvider) {
      setAiApiProvider(settings.userConfig.aiApiProvider);
    }
  }, [settings]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus(null);
    try {
      await saveSettings({
        botConfig: { maxOrderSizeUsdc, maxExposureUsdc, minPrice, maxPrice, dryRun },
        userConfig: {
          ...(polymarketApiKey ? { polymarketApiKey } : {}),
          ...(polymarketApiSecret ? { polymarketApiSecret } : {}),
          aiApiProvider,
          ...(aiApiKey ? { aiApiKey } : {}),
        },
      });
      setPolymarketApiKey("");
      setPolymarketApiSecret("");
      setAiApiKey("");
      setStatus("Settings saved.");
    } catch {
      setStatus("Failed to save settings.");
    }
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto overscroll-y-contain px-4 pb-safe pt-[calc(3.5rem+env(safe-area-inset-top))] md:px-8 md:pb-8 md:pt-6">
        <div className="mx-auto w-full max-w-3xl space-y-3">
          <div className="h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
          <div className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10" />
        </div>
      </div>
    );
  }

  const providerOptions = settings?.readiness.aiProviders ?? [];

  return (
    <div className="h-full overflow-y-auto overscroll-y-contain px-4 pb-safe pt-[calc(3.5rem+env(safe-area-inset-top))] md:px-8 md:pb-8 md:pt-6">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-300/70 bg-white/90 p-5 sm:p-6 dark:border-white/15 dark:bg-black/30"
      >
        <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
          Configure trade guardrails and API credentials for your playground.
        </p>
        {readiness && !readiness.onboardingCompleted ? (
          <div className="mb-6 rounded-xl border border-amber-300/70 bg-amber-50/80 p-4 dark:border-amber-400/30 dark:bg-amber-950/30">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Account setup is incomplete. Required: trade guardrails and an AI provider key.
            </p>
            <button
              type="button"
              className="mt-3 min-h-10 rounded-full border border-amber-400/60 px-4 py-2 text-sm text-amber-950 dark:text-amber-100"
              onClick={openOnboarding}
            >
              Continue setup
            </button>
          </div>
        ) : null}
        <form className="space-y-5" onSubmit={onSubmit}>
          <h2 className="text-sm uppercase tracking-[0.12em] text-slate-500 dark:text-neutral-400">Trade guardrails</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm text-slate-700 dark:text-neutral-300">Max order size (USDC)
              <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="number" min={1} value={maxOrderSizeUsdc} onChange={(event) => setMaxOrderSizeUsdc(Number(event.target.value))} />
            </label>
            <label className="block text-sm text-slate-700 dark:text-neutral-300">Max exposure (USDC)
              <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="number" min={1} value={maxExposureUsdc} onChange={(event) => setMaxExposureUsdc(Number(event.target.value))} />
            </label>
            <label className="block text-sm text-slate-700 dark:text-neutral-300">Min price
              <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="number" min={0} max={1} step={0.01} value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value))} />
            </label>
            <label className="block text-sm text-slate-700 dark:text-neutral-300">Max price
              <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="number" min={0} max={1} step={0.01} value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300">
            <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} />
            Dry-run mode (no live orders)
          </label>
          <h2 className="text-sm uppercase tracking-[0.12em] text-slate-500 dark:text-neutral-400">API credentials</h2>
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            Leave a field blank to keep the current stored value.
            {settings?.userConfig
              ? ` Keys on file: Poly ${settings.userConfig.hasPolymarketApiKey ? "yes" : "no"}, AI ${settings.userConfig.hasAiConfig ? "yes" : "no"}.`
              : ""}
          </p>
          <label className="block text-sm text-slate-700 dark:text-neutral-300">
            AI provider
            <select
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100"
              value={aiApiProvider}
              onChange={(event) => setAiApiProvider(event.target.value as "gemini" | "claude" | "deepseek")}
            >
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-slate-700 dark:text-neutral-300">AI API key
            <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="password" value={aiApiKey} onChange={(event) => setAiApiKey(event.target.value)} placeholder={settings?.userConfig?.hasAiApiKey ? "••••••••" : "Not set"} />
          </label>
          <label className="block text-sm text-slate-700 dark:text-neutral-300">Polymarket API key
            <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="password" value={polymarketApiKey} onChange={(event) => setPolymarketApiKey(event.target.value)} placeholder={settings?.userConfig?.hasPolymarketApiKey ? "••••••••" : "Not set"} />
          </label>
          <label className="block text-sm text-slate-700 dark:text-neutral-300">Polymarket API secret
            <input className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 outline-none sm:text-sm dark:border-white/15 dark:bg-black/35 dark:text-neutral-100" type="password" value={polymarketApiSecret} onChange={(event) => setPolymarketApiSecret(event.target.value)} placeholder={settings?.userConfig?.hasPolymarketApiSecret ? "••••••••" : "Not set"} />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
          <button className="min-h-11 w-full rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 sm:w-auto dark:bg-neutral-100 dark:text-neutral-900" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      </motion.section>
    </div>
  );
}
