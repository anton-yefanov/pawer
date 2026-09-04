import { Pressable, StyleSheet, View } from 'react-native';

import { CardCover } from '@/components/templates/card-cover';
import { CARD_COLORS, type CardColor } from '@/constants/card-colors';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

/** `disabled` is for the covers that never show their hue — exercise previews
 *  and a photo. The row stays in place and goes quiet rather than leaving, so
 *  the artwork above it doesn't jump between tabs. */
export function ColorPicker({
  selected,
  onSelect,
  disabled = false,
}: {
  selected: CardColor;
  onSelect: (color: CardColor) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.row, disabled && styles.quiet]}>
      {CARD_COLORS.map((color) => (
        <Swatch
          key={color}
          color={color}
          selected={color === selected}
          disabled={disabled}
          onPress={() => onSelect(color)}
        />
      ))}
    </View>
  );
}

function Swatch({
  color,
  selected,
  disabled,
  onPress,
}: {
  color: CardColor;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={color}
      accessibilityState={{ selected, disabled }}
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
  quiet: {
    opacity: 0.4,
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
