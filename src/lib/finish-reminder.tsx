import { router } from 'expo-router';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { useAppStateActive, useAppStateBackground } from '@/hooks/use-app-state-active';
import {
  addNotificationResponseListener,
  cancelScheduledNotification,
  getLastNotificationResponse,
  readFinishReminderWorkoutId,
  scheduleNotification,
  FINISH_REMINDER_DATA_TYPE,
  REMINDER_CHANNEL_ID,
} from '@/lib/notifications';
import { activeWorkoutId } from '@/lib/workout-actions';
import { activeWorkoutForReminder } from '@/lib/workout-queries';

import { attempt } from '@/lib/observability';

const PREFERENCE_KEY = 'finish_reminder_minutes';
const STATE_KEY = 'finish_reminder';

/**
 * A reminder is scheduled once, as the app goes to background, from the last
 * write timestamp already in the database — never on each mutation. That keeps
 * `workout-actions` untouched and means a burst of debounced keystroke writes
 * costs nothing, since only the final state is ever read.
 *
 * The one case it misses is a hard crash straight from the foreground, which
 * leaves nothing pending. A force-quit from the app switcher backgrounds first,
 * and so does locking the phone, so the sessions people actually forget about
 * are covered.
 */

export type FinishReminderOption = '10' | '20' | '30' | '60' | 'never';

export const FINISH_REMINDER_OPTIONS: { id: FinishReminderOption; label: string; short: string }[] =
  [
    { id: '10', label: '10 Minutes', short: '10 min' },
    { id: '20', label: '20 Minutes', short: '20 min' },
    { id: '30', label: '30 Minutes', short: '30 min' },
    { id: '60', label: '60 Minutes', short: '60 min' },
    { id: 'never', label: 'Never', short: 'Never' },
  ];

const DEFAULT_OPTION: FinishReminderOption = '30';

/**
 * Someone who sat on the logging screen past the interval without typing yields
 * a fire time already in the past, which iOS delivers the instant they lock the
 * phone. Give it a floor.
 */
const MIN_LEAD_MS = 60_000;

type Scheduled = { workoutId: string; fireAt: number; notificationId: string };

type FinishReminderValue = {
  option: FinishReminderOption;
  setOption: (next: FinishReminderOption) => Promise<void>;
};

const FinishReminderContext = createContext<FinishReminderValue | null>(null);

export function FinishReminderProvider({ children }: { children: ReactNode }) {
  const [option, setStored] = useState<FinishReminderOption>(DEFAULT_OPTION);

  // The AppState listeners fire outside render, so they read refs rather than
  // re-subscribing every time the preference or the pending reminder changes.
  const optionRef = useRef(option);
  const scheduledRef = useRef<Scheduled | null>(null);

  useEffect(() => {
    optionRef.current = option;
  });

  useEffect(() => {
    let cancelled = false;
    void attempt(
      'settings',
      getSetting(db, PREFERENCE_KEY).then((value) => {
        if (!cancelled && isOption(value)) setStored(value);
      })
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void attempt(
      'finish-reminder',
      (async () => {
        const raw = await getSetting(db, STATE_KEY);
        if (!raw) return;
        scheduledRef.current = JSON.parse(raw) as Scheduled;
        // Whatever was pending was scheduled for a session we can no longer
        // see, or the app is open now, which is itself the answer to "still
        // working out?" — either way it is stale.
        await clear();
      })()
    );
  }, []);

  useEffect(() => {
    const open = async (workoutId: string) => {
      // A tap can arrive long after the workout was finished on another screen;
      // opening a finished session in active mode would be wrong.
      if ((await activeWorkoutId()) !== workoutId) return;
      // The workout stack refuses to dismiss and present in the same tick.
      setTimeout(() => router.navigate({ pathname: '/active', params: { id: workoutId } }), 0);
    };

    void getLastNotificationResponse().then((response) => {
      const id = readFinishReminderWorkoutId(response);
      if (id) void open(id);
    });

    const sub = addNotificationResponseListener((response) => {
      const id = readFinishReminderWorkoutId(response);
      if (id) void open(id);
    });
    return () => sub.remove();
  }, []);

  useAppStateBackground(() => void schedule());
  useAppStateActive(() => void clear());

  async function schedule() {
    await clear();
    const minutes = optionRef.current;
    if (minutes === 'never') return;

    const workout = await activeWorkoutForReminder();
    if (!workout) return;

    const fireAt = Math.max(
      workout.lastActivityAt + Number(minutes) * 60_000,
      Date.now() + MIN_LEAD_MS
    );
    const notificationId = await scheduleNotification({
      title: 'Still working out?',
      body: `${workout.name?.trim() || 'Your workout'} is still running. Tap to finish it.`,
      date: fireAt,
      channelId: REMINDER_CHANNEL_ID,
      interruptionLevel: 'active',
      data: { type: FINISH_REMINDER_DATA_TYPE, workoutId: workout.id },
    });
    if (!notificationId) return;

    scheduledRef.current = { workoutId: workout.id, fireAt, notificationId };
    await setSetting(db, STATE_KEY, JSON.stringify(scheduledRef.current));
  }

  async function clear() {
    await cancelScheduledNotification(scheduledRef.current?.notificationId ?? null);
    scheduledRef.current = null;
    await setSetting(db, STATE_KEY, '');
  }

  const value: FinishReminderValue = {
    option,
    setOption: async (next) => {
      setStored(next);
      optionRef.current = next;
      await setSetting(db, PREFERENCE_KEY, next);
      if (next === 'never') await clear();
    },
  };

  return <FinishReminderContext value={value}>{children}</FinishReminderContext>;
}

export function useFinishReminder(): FinishReminderValue {
  const value = use(FinishReminderContext);
  if (!value) throw new Error('useFinishReminder must be used inside FinishReminderProvider');
  return value;
}

function isOption(value: string | null): value is FinishReminderOption {
  return FINISH_REMINDER_OPTIONS.some((entry) => entry.id === value);
}
