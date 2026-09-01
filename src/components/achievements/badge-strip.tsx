import { useId, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BadgeRow, type BadgeFace } from '@/components/achievements/badge-canvas';
import { useBadgeSpotlight } from '@/components/achievements/badge-spotlight';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { acknowledgeBadge, badgeKey } from '@/lib/achievement-news';
import type { LadderMetric } from '@/lib/achievement-scale';
import { formatLadderValue, type Badge } from '@/lib/achievements';
import { lockedMaterial, struckMaterial } from '@/lib/badge-material';
import * as haptics from '@/lib/haptics';
import { attempt } from '@/lib/observability';
import type { WeightUnit } from '@/lib/units';
import { formatDay } from '@/lib/workout-stats';

const COLUMNS = 3;

/**
 * One ladder's badges. The discs are drawn by a single Skia canvas per row of
 * three, with a `Pressable` per slot laid over it — an exercise can show
 * fifteen badges, and a canvas each is what would make this scroll worse than
 * the flat discs it replaces.
 *
 * `size` comes from the caller, the rule `ArtworkLayer` holds: a badge that
 * measured itself would draw a frame late, and a grid of those flickers as it
 * scrolls.
 */
export function BadgeStrip({
  badges,
  exerciseId,
  newKeys,
  metric,
  best,
  unit,
  size,
  gap,
}: {
  badges: readonly Badge[];
  exerciseId: string;
  /** Badges unlocked since the user last looked at them — see `achievement-news.ts`. */
  newKeys: ReadonlySet<string>;
  metric: LadderMetric;
  best: number;
  unit: WeightUnit;
  size: number;
  gap: number;
}) {
  const theme = useTheme();
  const spotlight = useBadgeSpotlight();
  const slots = useRef<Record<string, View | null>>({});
  // Tier ids repeat across every exercise and ladder on the screen, so the slot
  // the spotlight lifted from is only identifiable per strip.
  const strip = useId();
  const slotId = (badge: Badge) => `${strip}:${badge.tier.id}`;
  // Narrowed to this strip before it reaches the memo below: keyed on the
  // spotlight's own value, lifting any badge on the screen would re-record
  // every row's picture, and that burst of work lands on the frame the lift
  // animation starts.
  const lifted = spotlight.lifted?.startsWith(`${strip}:`) ? spotlight.lifted : null;

  const rows = useMemo(() => {
    const locked = lockedMaterial(theme);
    const chunks: { badges: readonly Badge[]; faces: BadgeFace[] }[] = [];
    for (let i = 0; i < badges.length; i += COLUMNS) {
      const chunk = badges.slice(i, i + COLUMNS);
      chunks.push({
        badges: chunk,
        faces: chunk.map((badge) => ({
          numeral: badge.tier.numeral,
          material:
            badge.unlockedAt != null ? struckMaterial(badge.tier.id, badge.tier.material) : locked,
          hidden: `${strip}:${badge.tier.id}` === lifted,
        })),
      });
    }
    return chunks;
  }, [badges, lifted, strip, theme]);

  function press(badge: Badge) {
    haptics.tap();
    void attempt('settings', acknowledgeBadge(badgeKey(exerciseId, metric, badge.tier.id)));
    slots.current[badge.tier.id]?.measureInWindow((x, y, width) => {
      spotlight.open(
        {
          id: slotId(badge),
          tier: badge.tier,
          unlocked: badge.unlockedAt != null,
          requirement: formatLadderValue(metric, badge.threshold, unit),
          detail: detailFor(badge, metric, best, unit),
        },
        { x, y, size: width }
      );
    });
  }

  return (
    <View style={styles.strip}>
      {rows.map((row) => (
        <View key={row.badges[0].tier.id} style={styles.row}>
          <View style={{ height: size }}>
            <BadgeRow faces={row.faces} size={size} gap={gap} />
            <View style={[styles.slots, { gap }]}>
              {row.badges.map((badge) => (
                <Pressable
                  key={badge.tier.id}
                  ref={(node) => {
                    slots.current[badge.tier.id] = node;
                  }}
                  style={{ width: size, height: size }}
                  accessibilityRole="button"
                  accessibilityLabel={`${badge.tier.name}, ${formatLadderValue(metric, badge.threshold, unit)}`}
                  onPress={() => press(badge)}>
                  {newKeys.has(badgeKey(exerciseId, metric, badge.tier.id)) && (
                    <View
                      style={[styles.chip, { backgroundColor: theme.accent }]}
                      pointerEvents="none">
                      <ThemedText
                        type="caption2"
                        weight="semibold"
                        style={{ color: theme.accentContent }}>
                        NEW
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <View style={[styles.slots, { gap }]}>
            {row.badges.map((badge) => (
              <ThemedText
                key={badge.tier.id}
                type="caption1"
                numeric
                numberOfLines={1}
                themeColor={badge.unlockedAt != null ? 'text' : 'textTertiary'}
                style={[styles.label, { width: size }]}>
                {formatLadderValue(metric, badge.threshold, unit)}
              </ThemedText>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function detailFor(badge: Badge, metric: LadderMetric, best: number, unit: WeightUnit): string {
  if (badge.unlockedAt != null) return `Earned ${formatDay(badge.unlockedAt)}`;
  if (best <= 0) return 'Not trained yet';
  return `${formatLadderValue(metric, badge.threshold - best, unit)} to go`;
}

const styles = StyleSheet.create({
  strip: {
    gap: Spacing.three,
  },
  row: {
    gap: Spacing.one,
  },
  slots: {
    flexDirection: 'row',
  },
  label: {
    textAlign: 'center',
  },
  // Over the badge's own slot, which already sits above the row's canvas.
  chip: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.one,
    borderRadius: 6,
  },
});
