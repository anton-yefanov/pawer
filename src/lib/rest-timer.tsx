import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import * as haptics from '@/lib/haptics';
import { cancelRestNotification, scheduleRestNotification } from '@/lib/notifications';

const STATE_KEY = 'rest_timer';

export const DEFAULT_REST_SECONDS = 90;

type RestState = {
  setId: string;
  endsAt: number;
  /** What the countdown started from, so the progress bar has a denominator. */
  total: number;
  notificationId: string | null;
};

type RestTimer = {
  setId: string | null;
  /** Seconds left, recomputed from wall-clock. */
  remaining: number;
  total: number;
  /** Epoch ms the countdown ends at, for anything animating continuously. */
  endsAt: number | null;
  start: (input: { setId: string; seconds: number; exerciseName: string }) => Promise<void>;
  adjust: (deltaSeconds: number) => Promise<void>;
  cancel: () => Promise<void>;
};

const RestTimerContext = createContext<RestTimer | null>(null);

/**
 * Only the end timestamp is state; the countdown is always `endsAt - now`.
 * Persisting it to the settings table means an app kill mid-rest still resumes
 * correctly, not just a background/foreground round trip.
 */
export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getSetting(db, STATE_KEY).then((raw) => {
      if (cancelled || !raw) return;
      const stored = JSON.parse(raw) as RestState;
      if (stored.endsAt > Date.now()) setRest(stored);
      else void clearStored();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      const time = Date.now();
      if (time >= rest.endsAt) {
        // Only the live path buzzes. Expiring while backgrounded comes through
        // `useAppStateActive` below, and the scheduled notification already
        // announced it — a buzz on return would be a second, late alarm.
        haptics.complete();
        setRest(null);
        void clearStored();
      } else {
        setNow(time);
      }
    }, 500);
    return () => clearInterval(id);
  }, [rest]);

  useAppStateActive(() => {
    if (rest && Date.now() >= rest.endsAt) {
      setRest(null);
      void clearStored();
    } else {
      setNow(Date.now());
    }
  });

  const remaining = rest ? Math.max(0, Math.ceil((rest.endsAt - now) / 1000)) : 0;

  const value: RestTimer = {
    setId: rest?.setId ?? null,
    remaining,
    total: rest?.total ?? 0,
    endsAt: rest?.endsAt ?? null,

    start: async ({ setId, seconds, exerciseName }) => {
      await cancelRestNotification(rest?.notificationId ?? null);
      if (seconds <= 0) {
        setRest(null);
        await clearStored();
        return;
      }
      const endsAt = Date.now() + seconds * 1000;
      const notificationId = await scheduleRestNotification(endsAt, `Next set: ${exerciseName}`);
      const next = { setId, endsAt, total: seconds, notificationId };
      setNow(Date.now());
      setRest(next);
      await setSetting(db, STATE_KEY, JSON.stringify(next));
    },

    adjust: async (deltaSeconds) => {
      if (!rest) return;
      await cancelRestNotification(rest.notificationId);
      const endsAt = Math.max(Date.now(), rest.endsAt + deltaSeconds * 1000);
      const notificationId = await scheduleRestNotification(endsAt, 'Next set');
      const next = {
        ...rest,
        endsAt,
        total: Math.max(1, rest.total + deltaSeconds),
        notificationId,
      };
      setRest(next);
      await setSetting(db, STATE_KEY, JSON.stringify(next));
    },

    cancel: async () => {
      await cancelRestNotification(rest?.notificationId ?? null);
      setRest(null);
      await clearStored();
    },
  };

  return <RestTimerContext value={value}>{children}</RestTimerContext>;
}

export function useRestTimer(): RestTimer {
  const value = use(RestTimerContext);
  if (!value) throw new Error('useRestTimer must be used inside RestTimerProvider');
  return value;
}

function clearStored() {
  return setSetting(db, STATE_KEY, '');
}
