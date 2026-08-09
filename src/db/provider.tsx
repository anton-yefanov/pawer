import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { seedIfNeeded } from './seed';

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

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    seedIfNeeded(db)
      .then(({ seeded, count }) => {
        if (cancelled) return;
        if (seeded) console.log(`[db] seeded ${count} exercises`);
        setStatus({ phase: 'ready' });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus({ phase: 'error', error: e instanceof Error ? e : new Error(String(e)) });
      });

    return () => {
      cancelled = true;
    };
  }, [success]);

  const error = migrationError ?? (status.phase === 'error' ? status.error : undefined);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Database error</Text>
        <Text style={styles.body}>{error.message}</Text>
      </View>
    );
  }

  if (status.phase !== 'ready') {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Suspense fallback={<View style={styles.center} />}>{children}</Suspense>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 14, opacity: 0.7, textAlign: 'center' },
});
