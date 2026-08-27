import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ExerciseSection, SectionRule } from '@/components/exercises/exercise-section';
import { PrChip } from '@/components/pr-chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ExerciseRecordRow } from '@/lib/exercise-history-queries';
import { earnsRecords } from '@/lib/exercise-metrics';
import { formatPrValue, PR_KINDS, PR_LABELS } from '@/lib/personal-records';
import type { TrackingType } from '@/lib/tracking-types';
import type { WeightUnit } from '@/lib/units';
import { formatDay } from '@/lib/workout-stats';

export function ExerciseRecords({
  records,
  trackingType,
  unit,
}: {
  records: readonly ExerciseRecordRow[];
  trackingType: TrackingType;
  unit: WeightUnit;
}) {
  if (!earnsRecords(trackingType)) return null;

  // Ordered by `PR_KINDS` rather than by whatever SQLite grouped first, so the
  // list reads the same on every exercise.
  const known = PR_KINDS.flatMap((kind) => {
    const record = records.find((row) => row.kind === kind);
    return record ? [{ ...record, kind }] : [];
  });

  if (known.length === 0) {
    return (
      <ExerciseSection title="Records">
        <ThemedText type="small" themeColor="textSecondary">
          No records yet.
        </ThemedText>
      </ExerciseSection>
    );
  }

  return (
    <ExerciseSection title="Records">
      <View>
        {known.map((record, index) => (
          <Fragment key={record.kind}>
            {index > 0 && <SectionRule />}
            <View style={styles.row}>
              <PrChip label={PR_LABELS[record.kind]} />
              <ThemedText type="smallBold" style={styles.value}>
                {formatPrValue(record.kind, record.value, unit)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDay(record.achievedAt)}
              </ThemedText>
            </View>
          </Fragment>
        ))}
      </View>
    </ExerciseSection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
  },
  value: {
    marginLeft: 'auto',
    fontVariant: ['tabular-nums'],
  },
});
