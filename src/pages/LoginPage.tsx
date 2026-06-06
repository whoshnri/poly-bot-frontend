import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { List } from "@phosphor-icons/react";
import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { OnboardingContextProvider } from "../hooks/useOnboarding";
import { SettingsProvider, useSettings } from "../hooks/useSettings";
import { useSessions } from "../hooks/useSessions";
import { OnboardingModal } from "../components/OnboardingModal";
import { SessionsRail } from "../components/SessionsRail";

type ShellContext = ReturnType<typeof useSessions>;

export function useShellContext() {
  return useOutletContext<ShellContext>();
}

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result =
        mode === "login"
          ? await login({ userId, password })
          : await register({ userId, password });
      if (result.success) navigate("/", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-neutral-900 px-4 py-8 pb-safe pt-safe">
      <section className="w-full max-w-sm p-6 text-neutral-100 s sm:p-7">
        <h2 className="mb-5 text-4xl leading-6 text-neutral-200  text-center">
          Login
        </h2>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm text-neutral-300">
            User ID
            <input
              className="mt-1.5 w-full rounded-full border border-white/15 bg-black/35 px-3 py-2.5 text-base text-neutral-100 outline-none"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              autoComplete="username"
              required
              minLength={3}
            />
          </label>
          <label className="block text-sm text-neutral-300">
            Password
            <input
              className="mt-1.5 w-full rounded-full border border-white/15 bg-black/35 px-3 py-2.5 text-base text-neutral-100 outline-none"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={8}
            />
          </label>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            className="w-full rounded-full bg-neutral-100 px-4 py-3 text-sm font-medium text-neutral-900 disabled:opacity-50"
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? "Working..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <button
          className="mt-3 text-sm text-center w-full text-neutral-300 hover:underline hover:text-neutral-200"
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError(null);
          }}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </div>
  );
}

function SessionSkeleton() {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-7xl gap-4 md:h-[calc(100dvh-1.5rem)]">
      <div className="hidden w-72 shrink-0 rounded-2xl border border-slate-300/70 bg-white/80 p-4 md:block dark:border-white/10 dark:bg-black/20">
        <div className="h-6 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-white/10"
            />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col rounded-2xl border border-slate-300/70 bg-white/80 p-4 dark:border-white/10 dark:bg-black/20">
        <div className="h-24 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="mt-4 h-56 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
        <div className="mt-auto h-28 w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-white/10" />
      </div>
    </div>
  );
}

export function ProtectedLayout() {
  return (
    <SettingsProvider>
      <ProtectedShell />
    </SettingsProvider>
  );
}

function ProtectedShell() {
  const { user, loading } = useAuth();
  const sessionsState = useSessions();
  const { settings, readiness, loading: settingsLoading, saving, error, saveSettings } = useSettings();
  const { sessions, deleteSession } = sessionsState;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ sessionId?: string }>();
  const activeSessionId = location.pathname.startsWith("/settings")
    ? null
    : (params.sessionId ?? null);

  useEffect(() => {
    setOnboardingDismissed(false);
  }, [user?.userId]);

  useEffect(() => {
    if (settingsLoading || onboardingDismissed) {
      return;
    }
    if (readiness && !readiness.onboardingCompleted) {
      setOnboardingOpen(true);
    } else {
      setOnboardingOpen(false);
    }
  }, [settingsLoading, onboardingDismissed, readiness?.onboardingCompleted]);

  const onboardingContextValue = useMemo(
    () => ({
      open: onboardingOpen,
      openOnboarding: () => {
        setOnboardingDismissed(false);
        setOnboardingOpen(true);
      },
      closeOnboarding: () => {
        setOnboardingOpen(false);
        setOnboardingDismissed(true);
      },
    }),
    [onboardingOpen],
  );

  if (loading || sessionsState.loading || settingsLoading) {
    return (
      <div className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_0%_0%,#f2f5fb_0%,#e7edf5_45%,#dbe4ef_100%)] md:p-3 dark:bg-[radial-gradient(circle_at_0%_0%,#272727_0%,#161616_45%,#111111_100%)]">
        <SessionSkeleton />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <OnboardingContextProvider value={onboardingContextValue}>
      <div className="playground-scrollbars h-dvh overflow-hidden bg-[radial-gradient(circle_at_0%_0%,#f2f5fb_0%,#e7edf5_45%,#dbe4ef_100%)] text-slate-900 md:p-3 dark:bg-[radial-gradient(circle_at_0%_0%,#272727_0%,#161616_45%,#111111_100%)] dark:text-neutral-100">
      <button
        type="button"
        className="fixed left-4 top-[max(0.75rem,env(safe-area-inset-top))] z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white/90 text-slate-700 shadow-sm md:hidden dark:border-white/15 dark:bg-black/80 dark:text-neutral-100"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open sessions menu"
      >
        <List size={20} />
      </button>
      <LayoutGroup id="app-shell">
        <div className="mx-auto flex h-dvh max-w-7xl gap-0 md:h-[calc(100dvh-1.5rem)] md:gap-4">
          <SessionsRail
            sessions={sessions}
            activeSessionId={activeSessionId}
            mobileOpen={mobileNavOpen}
            collapsed={sidebarCollapsed}
            onCloseMobile={() => setMobileNavOpen(false)}
            onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
            onSelectSession={(sessionId) => navigate(`/${sessionId}`)}
            onDeleteSession={(sessionId, sessionName) =>
              setDeleteTarget({ id: sessionId, name: sessionName })
            }
          />
          <motion.main
            layout
            transition={{
              layout: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
            }}
            className="min-w-0 flex-1 overflow-hidden border-slate-300/70 bg-white/70 md:rounded-2xl md:border dark:border-white/10 dark:bg-black/20"
          >
            <Outlet context={sessionsState} />
          </motion.main>
        </div>
      </LayoutGroup>
      <AnimatePresence>
        {deleteTarget ? (
          <motion.div
            className="fixed inset-0 z-[70] grid place-items-center bg-black/40 p-4 dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border border-slate-300 bg-white p-5 pb-safe sm:p-6 dark:border-white/15 dark:bg-neutral-950"
              initial={{ y: 14, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 14, opacity: 0, scale: 0.98 }}
            >
              <p className="text-base text-slate-900 dark:text-neutral-100">
                Delete session?
              </p>
              <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
                This will permanently remove "{deleteTarget.name}" and its
                thread history.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 dark:border-white/20 dark:text-neutral-200"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-full bg-red-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  onClick={async () => {
                    setDeleting(true);
                    try {
                      await deleteSession(deleteTarget.id);
                      if (activeSessionId === deleteTarget.id) navigate("/");
                      setDeleteTarget(null);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <OnboardingModal
        open={onboardingOpen}
        settings={settings}
        readiness={readiness}
        saving={saving}
        error={error}
        onClose={() => {
          setOnboardingOpen(false);
          setOnboardingDismissed(true);
        }}
        onSave={saveSettings}
      />
    </div>
    </OnboardingContextProvider>
  );
}
