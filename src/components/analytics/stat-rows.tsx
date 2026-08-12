import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const COLUMNS = 6;
const GAP = Spacing.two;

export type StatBadge = {
  label: string;
  value: string;
  /** Width in grid columns, out of {@link COLUMNS}. */
  span: number;
  hero?: boolean;
};

export function StatRows({ badges }: { badges: readonly StatBadge[] }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const unit = width > 0 ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  return (
    <View style={styles.grid} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {badges.map(({ label, value, span, hero }) => (
        <View
          key={label}
          style={[
            styles.badge,
            hero && styles.badgeHero,
            { backgroundColor: theme.surface },
            unit > 0 && { width: unit * span + GAP * (span - 1) },
            unit === 0 && styles.badgeHidden,
          ]}>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {label}
          </ThemedText>
          <ThemedText
            style={[styles.value, hero && styles.valueHero]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  badge: {
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: Spacing.half,
    minHeight: 72,
  },
  badgeHero: {
    minHeight: 96,
  },
  badgeHidden: {
    // The grid needs one layout pass before column widths exist.
    opacity: 0,
    width: 0,
  },
  value: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
  valueHero: {
    fontSize: 34,
    lineHeight: 40,
  },
});
