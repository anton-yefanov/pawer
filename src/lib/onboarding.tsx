import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { clearSetting, getSetting, setSetting } from '@/db/seed';

const ONBOARDING_KEY = 'onboarding_complete';

type OnboardingValue = {
  done: boolean;
  complete: () => Promise<void>;
  /** Debug-only, for replaying the flow while it is being built. */
  reset: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

/**
 * Renders nothing until the flag has been read. Guessing either way costs a
 * visible frame — guess `false` and a returning user sees the welcome screen
 * flash, guess `true` and a new one sees the tabs before onboarding covers
 * them. The read is one row and resolves well inside the splash animation.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSetting(db, ONBOARDING_KEY).then((value) => {
      if (!cancelled) setDone(value !== null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (done === null) return null;

  const value: OnboardingValue = {
    done,
    complete: async () => {
      setDone(true);
      await setSetting(db, ONBOARDING_KEY, String(Date.now()));
    },
    reset: async () => {
      setDone(false);
      await clearSetting(db, ONBOARDING_KEY);
    },
  };

  return <OnboardingContext value={value}>{children}</OnboardingContext>;
}

export function useOnboarding(): OnboardingValue {
  const value = use(OnboardingContext);
  if (!value) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return value;
}
