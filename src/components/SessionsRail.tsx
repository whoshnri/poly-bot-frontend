import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CaretDoubleLeft,
  CaretDoubleRight,
  ChatText,
  GearSix,
  MoonStars,
  SignOut,
  Sun,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { formatSessionDate } from "../lib/chatView";
import type { SessionSummary } from "../types";

type SessionsRailProps = {
  sessions: SessionSummary[];
  activeSessionId: string | null;
  mobileOpen: boolean;
  collapsed: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string, sessionName: string) => void;
};

export function SessionsRail({
  sessions,
  activeSessionId,
  mobileOpen,
  collapsed,
  onCloseMobile,
  onToggleCollapsed,
  onSelectSession,
  onDeleteSession,
}: SessionsRailProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <button
        type="button"
        className={`fixed inset-0 z-30 bg-black/50 right-0 transition md:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onCloseMobile}
        aria-hidden={!mobileOpen}
      />
      <motion.aside
        layout
        className={`fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[max(0.75rem,env(safe-area-inset-left))] top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-300/70 bg-white/95 p-3 text-slate-700 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-neutral-950/95 dark:text-neutral-200 md:relative md:inset-auto md:bottom-auto md:left-auto md:top-auto md:z-auto md:h-full md:shrink-0 md:translate-x-0 ${mobileOpen ? "w-[min(18rem,calc(100vw-1.5rem))] translate-x-0" : "w-[min(18rem,calc(100vw-1.5rem))] -translate-x-[110%]"} ${collapsed ? "md:w-14 md:px-2" : "md:w-72"}`}
        initial={false}
        animate={{ x: mobileOpen ? 0 : undefined }}
        transition={{
          type: "spring",
          stiffness: 320,
          damping: 32,
          layout: { duration: 0.26, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        <div
          className={`mb-4 flex items-center gap-2 ${collapsed ? "md:justify-center" : "justify-between"}`}
        >
          <span className={`text-lg font-medium serif-display ${collapsed ? "md:hidden" : ""}`}>zEBot</span>
          <div className={`flex items-center gap-2 ${collapsed ? "md:w-full md:justify-center" : ""}`}>
            <button
              type="button"
              className="hidden h-9 w-9 rounded-lg border border-slate-300 bg-white/70 text-sm hover:bg-white md:inline-flex md:items-center md:justify-center dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
            </button>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white/60 text-slate-700 hover:bg-white md:hidden dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
              onClick={onCloseMobile}
              aria-label="Close sessions menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <nav className={`mb-4 space-y-1 ${collapsed ? "md:flex md:flex-col md:items-center" : ""}`}>
          <Link
            to="/"
            onClick={onCloseMobile}
            title="Chat"
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10 ${location.pathname === "/" ? "bg-slate-200 text-slate-900 dark:bg-white/12 dark:text-white" : "text-slate-600 dark:text-neutral-300"} ${collapsed ? "md:w-10 md:justify-center md:px-0" : ""}`}
          >
            <ChatText size={16} />
            <span className={collapsed ? "md:hidden" : ""}>Chat</span>
          </Link>
          <Link
            to="/settings"
            onClick={onCloseMobile}
            title="Settings"
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10 ${location.pathname === "/settings" ? "bg-slate-200 text-slate-900 dark:bg-white/12 dark:text-white" : "text-slate-600 dark:text-neutral-300"} ${collapsed ? "md:w-10 md:justify-center md:px-0" : ""}`}
          >
            <GearSix size={16} />
            <span className={collapsed ? "md:hidden" : ""}>Settings</span>
          </Link>
        </nav>

        <div className={`mb-3 border-t border-slate-300/70 pt-3 dark:border-white/10 ${collapsed ? "md:hidden" : ""}`}>
          <p className="mb-2 px-3 text-[10px] text-slate-400 dark:text-neutral-500">
            Recents
          </p>
          <ul className="no-scrollbar max-h-[40dvh] space-y-1 overflow-auto pr-1 md:max-h-[45dvh]">
            {sessions.length === 0 ? (
              <li className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-white/15 dark:text-neutral-400">
                No sessions yet.
              </li>
            ) : (
              sessions.map((session) => {
                const sessionLabel = formatSessionDate(session.createdAt);
                return (
                <li key={session.id} className="group flex items-start gap-1">
                  <button
                    type="button"
                    title={sessionLabel}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`flex-1 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/10 ${session.id === activeSessionId ? "bg-slate-200 dark:bg-white/12" : ""}`}
                  >
                    <p className="truncate text-sm text-slate-800 dark:text-neutral-100">
                      {session.name || sessionLabel}
                    </p>
                    {session.resume.phase ? (
                      <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.1em] text-slate-500 dark:text-neutral-500">
                        {session.resume.phase}
                      </p>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="mt-2 h-6 w-6 rounded text-xs text-slate-500 hover:bg-red-500/20 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-300"
                    title="Delete session"
                    onClick={() => onDeleteSession(session.id, sessionLabel)}
                  >
                    <Trash size={14} className="mx-auto" />
                  </button>
                </li>
              );
              })
            )}
          </ul>
        </div>

        <div className={`mt-auto space-y-1 border-t border-slate-300/70 pt-3 dark:border-white/10 ${collapsed ? "md:flex md:flex-col md:items-center" : ""}`}>
          <button
            type="button"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-white/10 ${collapsed ? "md:w-10 md:justify-center md:px-0" : ""}`}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={16} /> : <MoonStars size={16} />}
            <span className={collapsed ? "md:hidden" : ""}>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <div
            className={`flex items-center gap-3 px-3 py-2 text-sm text-slate-500 dark:text-neutral-400 ${collapsed ? "md:hidden" : ""}`}
          >
            <UserCircle size={16} />
            <span className="truncate">{user?.userId}</span>
          </div>
          <button
            type="button"
            title="Sign out"
            className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-neutral-300 dark:hover:bg-white/10 ${collapsed ? "md:w-10 md:justify-center md:px-0" : ""}`}
            onClick={() => {
              void logout().then(() => navigate("/login"));
            }}
          >
            <SignOut size={16} />
            <span className={collapsed ? "md:hidden" : ""}>Sign out</span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
