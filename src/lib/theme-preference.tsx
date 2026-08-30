import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme as useDeviceColorScheme } from 'react-native';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { report } from '@/lib/observability';

const PREFERENCE_KEY = 'theme_preference';

export type ThemePreference = 'system' | 'dark' | 'light';

export const THEME_PREFERENCES: { id: ThemePreference; label: string; short: string }[] = [
  { id: 'system', label: 'Follow Phone Night Mode', short: 'System' },
  { id: 'dark', label: 'On', short: 'On' },
  { id: 'light', label: 'Off', short: 'Off' },
];

type ThemePreferenceValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setStored] = useState<ThemePreference | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Same as `OnboardingProvider`: nothing renders until this resolves.
    getSetting(db, PREFERENCE_KEY).then(
      (value) => {
        if (!cancelled) setStored(isPreference(value) ? value : 'system');
      },
      (error: unknown) => {
        report('settings', error, { phase: 'read-theme' });
        if (!cancelled) setStored('system');
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Overriding the appearance natively is what makes the preference reach UIKit
   * — the tab bar material, sheet chrome, SwiftUI menus, keyboard and status
   * bar all read the window's trait collection, not our JS colors.
   */
  useEffect(() => {
    if (preference === null || Platform.OS === 'web') return;
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  if (preference === null) return null;

  const value: ThemePreferenceValue = {
    preference,
    setPreference: async (next) => {
      setStored(next);
      await setSetting(db, PREFERENCE_KEY, next);
    },
  };

  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}

export function useThemePreference(): ThemePreferenceValue {
  const value = use(ThemePreferenceContext);
  if (!value) throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  return value;
}

/**
 * Falls back to the device scheme when read outside the provider, so the
 * loading and error screens `DatabaseProvider` renders before it mounts still
 * get a scheme instead of throwing.
 */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const device = useDeviceColorScheme();
  const stored = use(ThemePreferenceContext);

  if (!stored || stored.preference === 'system') return device === 'dark' ? 'dark' : 'light';
  return stored.preference;
}

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light';
}
