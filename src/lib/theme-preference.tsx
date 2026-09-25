import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance, Platform, useColorScheme as useDeviceColorScheme } from 'react-native';

import { t } from '@/i18n';
import { DEFAULT_TINT, isTintId, TINTS, type TintId } from '@/constants/tints';
import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { report } from '@/lib/observability';
import { setWindowTint } from '@/lib/window-tint';

const PREFERENCE_KEY = 'theme_preference';
const TINT_KEY = 'tint_color';

export type ThemePreference = 'system' | 'dark' | 'light';

export const THEME_PREFERENCES = (['system', 'light', 'dark'] as const).map((id) => ({
  id,
  get label() {
    return t(`settings:theme.${id}`);
  },
  get short() {
    return t(`settings:theme.${id}`);
  },
}));

type ThemePreferenceValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => Promise<void>;
  tint: TintId;
  setTint: (next: TintId) => Promise<void>;
};

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setStored] = useState<ThemePreference | null>(null);
  const [tint, setStoredTint] = useState<TintId | null>(null);
  const device = useDeviceColorScheme();

  useEffect(() => {
    let cancelled = false;
    // Same as `OnboardingProvider`: nothing renders until this resolves.
    Promise.all([getSetting(db, PREFERENCE_KEY), getSetting(db, TINT_KEY)]).then(
      ([value, storedTint]) => {
        if (cancelled) return;
        setStored(isPreference(value) ? value : 'system');
        setStoredTint(isTintId(storedTint) ? storedTint : DEFAULT_TINT);
      },
      (error: unknown) => {
        report('settings', error, { phase: 'read-theme' });
        if (cancelled) return;
        setStored('system');
        setStoredTint(DEFAULT_TINT);
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

  // UIKit alerts, action sheets and date pickers draw in the window's tint,
  // which no JS color reaches.
  const scheme = preference === 'system' || preference === null ? device : preference;
  useEffect(() => {
    if (tint === null) return;
    setWindowTint(TINTS[tint][scheme === 'dark' ? 'dark' : 'light'].accent);
  }, [tint, scheme]);

  if (preference === null || tint === null) return null;

  const value: ThemePreferenceValue = {
    preference,
    setPreference: async (next) => {
      setStored(next);
      await setSetting(db, PREFERENCE_KEY, next);
    },
    tint,
    setTint: async (next) => {
      setStoredTint(next);
      await setSetting(db, TINT_KEY, next);
    },
  };

  return <ThemePreferenceContext value={value}>{children}</ThemePreferenceContext>;
}

export function useThemePreference(): ThemePreferenceValue {
  const value = use(ThemePreferenceContext);
  if (!value) throw new Error('useThemePreference must be used inside ThemePreferenceProvider');
  return value;
}

const SchemeOverrideContext = createContext<'light' | 'dark' | null>(null);

/** Pins everything under it to one scheme whatever the preference — for a page that is always dark. */
export function ColorSchemeOverride({
  scheme,
  children,
}: {
  scheme: 'light' | 'dark';
  children: ReactNode;
}) {
  return <SchemeOverrideContext value={scheme}>{children}</SchemeOverrideContext>;
}

/**
 * Falls back to the device scheme when read outside the provider, so the
 * loading and error screens `DatabaseProvider` renders before it mounts still
 * get a scheme instead of throwing.
 */
export function useResolvedColorScheme(): 'light' | 'dark' {
  const device = useDeviceColorScheme();
  const stored = use(ThemePreferenceContext);
  const forced = use(SchemeOverrideContext);

  if (forced) return forced;
  if (!stored || stored.preference === 'system') return device === 'dark' ? 'dark' : 'light';
  return stored.preference;
}

/** Blue outside the provider, for the same pre-provider screens as above. */
export function useResolvedTint(): TintId {
  return use(ThemePreferenceContext)?.tint ?? DEFAULT_TINT;
}

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'dark' || value === 'light';
}
