import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { attempt } from '@/lib/observability';

export const WARMUP_STATS_KEY = 'include_warmup_stats';

type WarmupStatsValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => Promise<void>;
};

const WarmupStatsContext = createContext<WarmupStatsValue | null>(null);

export function WarmupStatsProvider({ children }: { children: ReactNode }) {
  const [enabled, setStored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void attempt(
      'settings',
      getSetting(db, WARMUP_STATS_KEY).then((value) => {
        if (!cancelled && value === 'true') setStored(true);
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value: WarmupStatsValue = {
    enabled,
    setEnabled: async (next) => {
      setStored(next);
      await setSetting(db, WARMUP_STATS_KEY, String(next));
    },
  };

  return <WarmupStatsContext value={value}>{children}</WarmupStatsContext>;
}

export function useWarmupStatsPreference(): WarmupStatsValue {
  const value = use(WarmupStatsContext);
  if (!value) throw new Error('useWarmupStatsPreference must be used inside WarmupStatsProvider');
  return value;
}

export function useIncludeWarmup(): boolean {
  return use(WarmupStatsContext)?.enabled ?? false;
}
