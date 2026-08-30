import * as Sentry from '@sentry/react-native';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { Pressable } from '@/components/pressable';
import { base } from '@/components/themed-text';
import { Colors, Spacing, Type } from '@/constants/theme';

type Props = { error: Error; retry: () => Promise<void> };

/**
 * Exported as `ErrorBoundary` from `src/app/_layout.tsx`, which is how
 * expo-router adopts it. Before this the app had no boundary at all: a throw
 * during render anywhere unmounted the tree to a blank screen with nothing
 * reported and no way back.
 *
 * `wrapExpoRouterErrorBoundary` is what captures the error — the component
 * itself only has to draw the way out.
 */
export const AppErrorBoundary = Sentry.wrapExpoRouterErrorBoundary(function AppErrorBoundary({
  error,
  retry,
}: Props) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Something went wrong</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{error.message}</Text>
      <Pressable onPress={() => void retry()} style={styles.retry}>
        <Text style={[styles.retryLabel, { color: colors.accent }]}>Try again</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four, gap: Spacing.two },
  title: { ...base, ...Type.title3 },
  body: { ...base, ...Type.body, textAlign: 'center' },
  retry: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.two },
  retryLabel: { ...base, ...Type.headline },
});
