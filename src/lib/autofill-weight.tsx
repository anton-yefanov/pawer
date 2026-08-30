import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { attempt } from '@/lib/observability';

export const AUTOFILL_WEIGHT_KEY = 'autofill_weight';

type AutofillWeightValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => Promise<void>;
};

const AutofillWeightContext = createContext<AutofillWeightValue | null>(null);

export function AutofillWeightProvider({ children }: { children: ReactNode }) {
  const [enabled, setStored] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void attempt(
      'settings',
      getSetting(db, AUTOFILL_WEIGHT_KEY).then((value) => {
        if (!cancelled && value === 'false') setStored(false);
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value: AutofillWeightValue = {
    enabled,
    setEnabled: async (next) => {
      setStored(next);
      await setSetting(db, AUTOFILL_WEIGHT_KEY, String(next));
    },
  };

  return <AutofillWeightContext value={value}>{children}</AutofillWeightContext>;
}

export function useAutofillWeightPreference(): AutofillWeightValue {
  const value = use(AutofillWeightContext);
  if (!value)
    throw new Error('useAutofillWeightPreference must be used inside AutofillWeightProvider');
  return value;
}

export function useAutofillWeight(): boolean {
  return use(AutofillWeightContext)?.enabled ?? true;
}
