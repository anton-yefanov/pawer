import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import { getSetting } from '@/db/seed';
import type { WeightUnit } from '@/lib/units';

export const WEIGHT_UNIT_KEY = 'weight_unit';

export function useWeightUnit(): WeightUnit {
  const [unit, setUnit] = useState<WeightUnit>('kg');

  useEffect(() => {
    let cancelled = false;
    getSetting(db, WEIGHT_UNIT_KEY).then((value) => {
      if (!cancelled && value === 'lb') setUnit('lb');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return unit;
}
