import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BigButton } from '@/components/workout/big-button';
import { Spacing } from '@/constants/theme';
import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { useAppStateActive } from '@/hooks/use-app-state-active';
import { useTheme } from '@/hooks/use-theme';
import { cancelScheduledNotification, scheduleRestNotification } from '@/lib/notifications';
import { formatDuration } from '@/lib/units';

const STATE_KEY = 'workout_timer';
const PRESETS = [60, 120, 180, 300, 600, 900] as const;

type TimerState = { endsAt: number; seconds: number; notificationId: string | null };

/**
 * A free-standing countdown, separate from the per-set rest timer — the user
 * drives this one by hand. Same §3.1 mechanics: an end timestamp in the
 * settings table, a notification scheduled for it, and a display recomputed
 * from wall-clock rather than counted down.
 */
export function TimerPanel() {
  const theme = useTheme();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [selected, setSelected] = useState<number>(180);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    getSetting(db, STATE_KEY).then((raw) => {
      if (cancelled || !raw) return;
      const stored = JSON.parse(raw) as TimerState;
      if (stored.endsAt > Date.now()) {
        setTimer(stored);
        setSelected(stored.seconds);
      } else {
        void setSetting(db, STATE_KEY, '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer]);

  useAppStateActive(() => setNow(Date.now()));

  const remaining = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : selected;
  const running = timer != null && remaining > 0;

  const start = async () => {
    const endsAt = Date.now() + selected * 1000;
    const notificationId = await scheduleRestNotification(endsAt, 'Timer finished');
    const next = { endsAt, seconds: selected, notificationId };
    setNow(Date.now());
    setTimer(next);
    await setSetting(db, STATE_KEY, JSON.stringify(next));
  };

  const stop = async () => {
    await cancelScheduledNotification(timer?.notificationId ?? null);
    setTimer(null);
    await setSetting(db, STATE_KEY, '');
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.container}>
      <ThemedText type="title" style={styles.readout}>
        {formatDuration(remaining)}
      </ThemedText>

      <View style={styles.presets}>
        {PRESETS.map((seconds) => (
          <Pressable
            key={seconds}
            disabled={running}
            onPress={() => setSelected(seconds)}
            style={({ pressed }) => [
              styles.preset,
              {
                backgroundColor:
                  selected === seconds ? theme.accent : theme.surface,
                opacity: running ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}>
            <ThemedText
              type="small"
              style={{ color: selected === seconds ? theme.accentContent : theme.text }}>
              {formatDuration(seconds)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <BigButton title={running ? 'Stop' : 'Start'} onPress={running ? stop : start} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  readout: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  preset: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 10,
  },
});
