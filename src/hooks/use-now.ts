import { useEffect, useState } from 'react';

import { useAppStateActive } from '@/hooks/use-app-state-active';

/**
 * A wall-clock timestamp that repaints its caller on an interval. Minutes are
 * the useful resolution for anything measured in hours, and resyncing on
 * foreground is what covers the interval not having run while JS was suspended.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  useAppStateActive(() => setNow(Date.now()));

  return now;
}
