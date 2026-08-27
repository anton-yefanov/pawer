import { Pressable, StyleSheet, View } from 'react-native';

import { CardCover } from '@/components/templates/card-cover';
import { CARD_COLORS, type CardColor } from '@/constants/card-colors';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export function ColorPicker({
  selected,
  onSelect,
}: {
  selected: CardColor;
  onSelect: (color: CardColor) => void;
}) {
  return (
    <View style={styles.row}>
      {CARD_COLORS.map((color) => (
        <Swatch
          key={color}
          color={color}
          selected={color === selected}
          onPress={() => onSelect(color)}
        />
      ))}
    </View>
  );
}

function Swatch({
  color,
  selected,
  onPress,
}: {
  color: CardColor;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={color}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      {/* Reserved on every swatch, transparent until selected, so selection
          doesn't resize the circle or shift the row. */}
      <View style={[styles.ring, selected && { borderColor: theme.accent }]}>
        <View style={styles.swatch}>
          <CardCover color={color} />
        </View>
      </View>
    </Pressable>
  );
}

const SWATCH = 34;
const RING = 2;
const GAP = 2;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.two,
  },
  // Even fractions rather than a gap: every colour on one row at any width.
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  ring: {
    padding: GAP,
    borderWidth: RING,
    borderColor: 'transparent',
    borderRadius: SWATCH / 2 + GAP + RING,
  },
  // Fixed, not `aspectRatio` off a percentage width: a cell wide enough to
  // clamp against `maxWidth` stretches the derived height and the circle ovals.
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    overflow: 'hidden',
  },
});
