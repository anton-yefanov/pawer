import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import type { WeightUnit } from '@/lib/units';
import { attempt } from '@/lib/observability';

export const WEIGHT_UNIT_KEY = 'weight_unit';

export const WEIGHT_UNITS: { id: WeightUnit; label: string }[] = [
  { id: 'kg', label: 'Kilograms (kg)' },
  { id: 'lb', label: 'Pounds (lb)' },
];

type WeightUnitValue = {
  unit: WeightUnit;
  setUnit: (next: WeightUnit) => Promise<void>;
};

const WeightUnitContext = createContext<WeightUnitValue | null>(null);

export function WeightUnitProvider({ children }: { children: ReactNode }) {
  const [unit, setStored] = useState<WeightUnit>('kg');

  useEffect(() => {
    let cancelled = false;
    void attempt(
      'settings',
      getSetting(db, WEIGHT_UNIT_KEY).then((value) => {
        if (!cancelled && value === 'lb') setStored('lb');
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const value: WeightUnitValue = {
    unit,
    setUnit: async (next) => {
      setStored(next);
      await setSetting(db, WEIGHT_UNIT_KEY, next);
    },
  };

  return <WeightUnitContext value={value}>{children}</WeightUnitContext>;
}

export function useWeightUnitPreference(): WeightUnitValue {
  const value = use(WeightUnitContext);
  if (!value) throw new Error('useWeightUnitPreference must be used inside WeightUnitProvider');
  return value;
}

export function useWeightUnit(): WeightUnit {
  return use(WeightUnitContext)?.unit ?? 'kg';
}
