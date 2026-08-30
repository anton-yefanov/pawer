import { router } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SectionRule } from '@/components/exercises/exercise-section';
import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseSession, ExerciseSetRow } from '@/lib/exercise-history-queries';
import * as haptics from '@/lib/haptics';
import { SET_TYPES, setTypeOf } from '@/lib/set-types';
import { formatPreviousSet, type TrackingType } from '@/lib/tracking-types';
import type { WeightUnit } from '@/lib/units';
import { groupBy } from '@/lib/workout-queries';
import { formatDay } from '@/lib/workout-stats';

export const HISTORY_SESSIONS = 5;

/** `3 × 140 kg × 8`, one line per run of identical sets. */
function summarise(
  rows: readonly ExerciseSetRow[],
  trackingType: TrackingType,
  unit: WeightUnit
): string[] {
  const lines: string[] = [];
  let run = 0;
  let current: string | null = null;

  const flush = () => {
    if (current !== null) lines.push(run > 1 ? `${run} × ${current}` : current);
  };

  for (const row of rows) {
    const { letter } = SET_TYPES[setTypeOf(row.setType)];
    const text = formatPreviousSet(row, trackingType, unit);
    const line = letter ? `${letter} · ${text}` : text;

    if (line === current) {
      run += 1;
      continue;
    }
    flush();
    current = line;
    run = 1;
  }
  flush();

  return lines;
}

export function ExerciseHistory({
  sessions,
  sets,
  prCounts,
  trackingType,
  unit,
}: {
  sessions: readonly ExerciseSession[];
  sets: readonly ExerciseSetRow[];
  prCounts: ReadonlyMap<string, number>;
  trackingType: TrackingType;
  unit: WeightUnit;
}) {
  const theme = useTheme();

  // `sessions` is oldest-first for the chart; history reads the other way.
  const recent = sessions.slice(-HISTORY_SESSIONS).reverse();
  if (recent.length === 0) {
    return (
      <ThemedText type="footnote" themeColor="textSecondary">
        No finished sessions with this exercise yet.
      </ThemedText>
    );
  }

  const byWorkout = groupBy(sets, (row) => row.workoutId);

  return (
    <View>
      {recent.map((session, index) => {
        const records = prCounts.get(session.workoutId) ?? 0;

        return (
          <Fragment key={session.workoutId}>
            {index > 0 && <SectionRule spaced />}
            <Pressable
              onPress={() => {
                haptics.tap();
                router.push({
                  pathname: '/history/workout-details',
                  params: { id: session.workoutId },
                });
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: theme.backgroundSelected },
              ]}>
              <View style={styles.sets}>
                {summarise(byWorkout.get(session.workoutId) ?? [], trackingType, unit).map(
                  (line, lineIndex) => (
                    <ThemedText key={`${line}-${lineIndex}`} numberOfLines={1}>
                      {line}
                    </ThemedText>
                  )
                )}
              </View>

              {/* The count alone: the trophy already says what it counts, and a
                  row this dense has no room for the word. */}
              {records > 0 && <PrChip label={String(records)} />}

              <View style={styles.meta}>
                <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
                  {formatDay(session.startedAt)}
                </ThemedText>
                {session.name?.trim() ? (
                  <ThemedText type="footnote" themeColor="textSecondary" numberOfLines={1}>
                    {session.name.trim()}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          </Fragment>
        );
      })}

      {sessions.length > recent.length && (
        <ThemedText type="footnote" themeColor="textTertiary" style={styles.footer}>
          Showing the last {recent.length} of {sessions.length} sessions.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    // The highlight spans the sheet's own column, edge to edge with the frames
    // and the tab pills above it, while the text inside it takes the pills'
    // padding — so a row's first character sits under the first pill's icon.
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    gap: Spacing.two,
  },
  sets: {
    flexShrink: 1,
    gap: Spacing.half,
  },
  meta: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  footer: {
    paddingTop: Spacing.two,
  },
});
