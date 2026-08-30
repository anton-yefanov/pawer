import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SplashScreen from 'expo-splash-screen';
import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { base } from '@/components/themed-text';
import { Colors, Spacing, Type } from '@/constants/theme';
import { breadcrumb, report, span } from '@/lib/observability';
import { track } from '@/lib/telemetry';

import migrations from '../../drizzle/migrations';
import { databaseOpenError, db } from './client';
import { SEED_VERSION, seedIfNeeded } from './seed';

type Status =
  | { phase: 'pending' }
  | { phase: 'ready' }
  | { phase: 'error'; error: Error };

/**
 * Runs migrations, then seeds the exercise library, before anything else
 * renders. Both are fast enough on a warm install that this is invisible; on a
 * cold install the seed inserts ~200 rows.
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [status, setStatus] = useState<Status>({ phase: 'pending' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!success) return;
    breadcrumb('migrations', 'migrations applied');
    let cancelled = false;

    span('seed', 'db.seed', () => seedIfNeeded(db))
      .then(({ seeded, count }) => {
        if (cancelled) return;
        if (seeded) breadcrumb('seed', 'seeded exercises', { count, version: SEED_VERSION });
        setStatus({ phase: 'ready' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus({ phase: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      });

    return () => {
      cancelled = true;
    };
  }, [success, attempt]);

  const scope = databaseOpenError ? 'database' : migrationError ? 'migrations' : 'seed';
  const error =
    databaseOpenError ?? migrationError ?? (status.phase === 'error' ? status.error : undefined);

  useEffect(() => {
    if (!error) return;
    // Otherwise the worst thing that can happen to a local-first app is
    // invisible: the user sees this screen and we never hear about it.
    track('app_error', { scope, message: error.message });
    report(scope, error, { seedVersion: SEED_VERSION });
    // `AnimatedSplashOverlay` is the only thing that calls `hideAsync`, and it
    // renders below this provider — which never reaches its children on this
    // branch. Without this the native splash stays up forever and the message
    // below is painted where nobody can read it.
    void SplashScreen.hideAsync();
  }, [error, scope]);

  const retry = useCallback(() => {
    setStatus({ phase: 'pending' });
    setAttempt((n) => n + 1);
  }, []);

  if (error) return <Bootstrap error={error} onRetry={databaseOpenError ? null : retry} />;
  if (status.phase !== 'ready') return <Bootstrap error={null} onRetry={null} />;

  return <Suspense fallback={<View style={styles.center} />}>{children}</Suspense>;
}

/**
 * Its own colours rather than `useTheme()`: this renders above
 * `ThemePreferenceProvider`, so the stored preference isn't readable yet.
 */
function Bootstrap({ error, onRetry }: { error: Error | null; onRetry: (() => void) | null }) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {error == null ? (
        <ActivityIndicator />
      ) : (
        <>
          <Text style={[styles.title, { color: colors.text }]}>Database error</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{error.message}</Text>
          {onRetry && (
            <Pressable onPress={onRetry} style={styles.retry}>
              <Text style={[styles.retryLabel, { color: colors.accent }]}>Try again</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { ...base, ...Type.title3 },
  body: { ...base, ...Type.body, textAlign: 'center' },
  retry: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  retryLabel: { ...base, ...Type.headline },
});
