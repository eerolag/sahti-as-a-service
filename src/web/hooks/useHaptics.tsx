import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { HapticInput } from "web-haptics";
import { useWebHaptics } from "web-haptics/react";

interface HapticsApi {
  isSupported: boolean;
  trigger: (input?: HapticInput) => void;
  selection: () => void;
  light: () => void;
  success: () => void;
  error: () => void;
}

function noop() {
  // no-op on platforms where haptics are unavailable.
}

const FALLBACK_HAPTICS: HapticsApi = {
  isSupported: false,
  trigger: noop,
  selection: noop,
  light: noop,
  success: noop,
  error: noop,
};

const HapticsContext = createContext<HapticsApi>(FALLBACK_HAPTICS);

function ignoreRejectedPromise(result: Promise<void> | undefined): void {
  if (!result) return;
  void result.catch(() => undefined);
}

export function HapticsProvider({ children }: { children: ReactNode }) {
  const debugEnabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("hapticsDebug");
  }, []);

  const { trigger, isSupported } = useWebHaptics({ debug: debugEnabled });

  const safeTrigger = useCallback(
    (input?: HapticInput) => {
      ignoreRejectedPromise(trigger(input));
    },
    [trigger],
  );

  const value = useMemo<HapticsApi>(
    () => ({
      isSupported,
      trigger: safeTrigger,
      selection: () => safeTrigger("selection"),
      light: () => safeTrigger("light"),
      success: () => safeTrigger("success"),
      error: () => safeTrigger("error"),
    }),
    [isSupported, safeTrigger],
  );

  return <HapticsContext.Provider value={value}>{children}</HapticsContext.Provider>;
}

export function useHaptics(): HapticsApi {
  return useContext(HapticsContext);
}
