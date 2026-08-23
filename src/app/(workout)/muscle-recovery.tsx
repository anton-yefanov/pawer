import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Card, SectionFooter, Separator } from '@/components/grouped-list';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { BodyMap } from '@/components/workout/body-map';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { MUSCLE_GROUP_LABELS } from '@/lib/muscle-groups';
import {
  formatLastTrained,
  formatReadyIn,
  isRecovering,
  muscleHitsQuery,
  readinessByGroup,
  recoveryByGroup,
  recoveryFill,
  recoveryLead,
  RECENT_DAYS,
  type GroupRecovery,
} from '@/lib/muscle-recovery';

const FIGURES_HEIGHT = 300;

export default function MuscleRecoveryScreen() {
  const theme = useTheme();
  const now = useNow();
  const { data } = useLiveQuery(muscleHitsQuery(), []);
  const groups = recoveryByGroup(data ?? [], now);
  const readiness = readinessByGroup(groups);

  return (
    <>
      <SheetHeader title="Muscle Recovery" />

      <ScrollView
        {...SHEET_SCROLL}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <ThemedText style={styles.lead}>{recoveryLead(groups)}</ThemedText>

        <Card>
          <View style={styles.figures}>
            {(['front', 'back'] as const).map((view) => (
              <View key={view} style={styles.figure}>
                <View style={styles.figureBody}>
                  <BodyMap view={view} readiness={readiness} />
                </View>
                <ThemedText style={styles.figureLabel} themeColor="textSecondary">
                  {view === 'front' ? 'Front' : 'Back'}
                </ThemedText>
              </View>
            ))}
          </View>
        </Card>

        <View style={styles.gap} />

        <Card>
          {groups.map((entry, index) => (
            <View key={entry.group}>
              {index > 0 && <Separator />}
              <View style={styles.row}>
                <View
                  style={[styles.dot, { backgroundColor: recoveryFill(entry.readiness, theme) }]}
                />
                <View style={styles.rowText}>
                  <ThemedText
                    style={[styles.name, isRecovering(entry) && styles.nameActive]}
                    numberOfLines={1}
                  >
                    {MUSCLE_GROUP_LABELS[entry.group]}
                  </ThemedText>
                  <ThemedText style={styles.history} themeColor="textSecondary" numberOfLines={1}>
                    {historyLine(entry)}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.readyIn, isRecovering(entry) && styles.readyInActive]}
                  themeColor={isRecovering(entry) ? 'text' : 'textSecondary'}
                >
                  {formatReadyIn(entry, now)}
                </ThemedText>
              </View>
            </View>
          ))}
        </Card>

        <SectionFooter>
          A muscle darkens as it is worked and fades back over 24 to 72 hours, depending on its
          size. Exercises that work a group as a secondary muscle recover in half that.
        </SectionFooter>
      </ScrollView>
    </>
  );
}

function historyLine(entry: GroupRecovery): string {
  if (entry.lastHitAt == null) return 'Not trained yet';

  const sets = `${entry.recentSets} ${entry.recentSets === 1 ? 'set' : 'sets'} in ${RECENT_DAYS} days`;
  const workout = entry.lastWorkoutName?.trim() || 'Workout';
  return `${formatLastTrained(entry.lastHitAt)} · ${workout} · ${sets}`;
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  lead: {
    paddingHorizontal: Spacing.three * 2,
    paddingBottom: Spacing.four,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  figures: {
    flexDirection: 'row',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  figure: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
  },
  figureBody: {
    height: FIGURES_HEIGHT,
    alignSelf: 'stretch',
  },
  figureLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gap: {
    height: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  name: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  nameActive: {
    fontWeight: '700',
  },
  history: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  readyIn: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  readyInActive: {
    fontWeight: '700',
  },
});
