import { StyleSheet, View } from 'react-native';

import { BadgeStrip } from '@/components/achievements/badge-strip';
import { ThemedText } from '@/components/themed-text';
import { TIER_COUNT } from '@/constants/achievement-tiers';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatLadderValue,
  LADDER_TITLES,
  type ExerciseAchievements as Item,
} from '@/lib/achievements';
import type { WeightUnit } from '@/lib/units';

const COLUMNS = 3;
const GAP = Spacing.three;

/**
 * One exercise's badges. A ladder's title only appears when the exercise has
 * more than one — a bench press earns weight and nothing else, so labelling it
 * "Weight" would only be noise above five discs.
 */
export function ExerciseAchievements({
  item,
  showLocked,
  newKeys,
  unit,
  width,
}: {
  item: Item;
  showLocked: boolean;
  newKeys: ReadonlySet<string>;
  unit: WeightUnit;
  width: number;
}) {
  const theme = useTheme();
  const badgeSize = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  const multiple = item.ladders.length > 1;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <ThemedText type="headline" numberOfLines={2} style={styles.name}>
          {item.name}
        </ThemedText>
        <ThemedText type="footnote" themeColor="textSecondary" numeric>
          {item.unlocked}/{item.ladders.length * TIER_COUNT}
        </ThemedText>
      </View>

      {item.ladders.map((ladder) => {
        const badges = showLocked
          ? ladder.badges
          : ladder.badges.filter((badge) => badge.unlockedAt != null);
        if (badges.length === 0) return null;

        return (
          <View key={ladder.metric} style={styles.ladder}>
            {(multiple || ladder.best > 0) && (
              <View style={styles.ladderHeader}>
                {multiple && (
                  <ThemedText type="footnote" themeColor="textSecondary">
                    {LADDER_TITLES[ladder.metric]}
                  </ThemedText>
                )}
                {ladder.best > 0 && (
                  <ThemedText type="footnote" themeColor="textTertiary" numeric style={styles.best}>
                    Best {formatLadderValue(ladder.metric, ladder.best, unit)}
                  </ThemedText>
                )}
              </View>
            )}
            <BadgeStrip
              badges={badges}
              exerciseId={item.exerciseId}
              newKeys={newKeys}
              metric={ladder.metric}
              best={ladder.best}
              unit={unit}
              size={badgeSize}
              gap={GAP}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flexShrink: 1,
  },
  ladder: {
    gap: Spacing.two,
  },
  ladderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  best: {
    marginLeft: 'auto',
  },
});
