import { useEffect, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import { formatElapsed } from '@/lib/workout-stats';

/** Always recomputed from wall-clock — the interval is a repaint trigger, not a counter. */
export function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useAppStateActive(() => setNow(Date.now()));

  return (
    <ThemedText type="headline" numeric>
      {formatElapsed(now - startedAt)}
    </ThemedText>
  );
}
