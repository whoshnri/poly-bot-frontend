import { createContext, useContext } from "react";

type OnboardingContextValue = {
  open: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingContextProvider = OnboardingContext.Provider;

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within ProtectedLayout.");
  }
  return context;
}
