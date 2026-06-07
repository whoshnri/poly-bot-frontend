import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ShellStatusContextValue = {
  status: string;
  setStatus: (status: string) => void;
};

const ShellStatusContext = createContext<ShellStatusContextValue | null>(null);

export function ShellStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState("Ready");

  const value = useMemo(
    () => ({
      status,
      setStatus,
    }),
    [status],
  );

  return <ShellStatusContext.Provider value={value}>{children}</ShellStatusContext.Provider>;
}

export function useShellStatus() {
  const context = useContext(ShellStatusContext);
  if (!context) {
    throw new Error("useShellStatus must be used within ShellStatusProvider.");
  }
  return context;
}
