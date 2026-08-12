import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionTitle } from '@/components/grouped-list';
import { CARD_COLORS, type CardColor } from '@/constants/card-colors';
import { SHEET_BOTTOM_INSET, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useCardGradient } from '@/hooks/use-card-gradient';
import { useTheme } from '@/hooks/use-theme';

export function ColorPicker({
  selected,
  onSelect,
}: {
  selected: CardColor;
  onSelect: (color: CardColor) => void;
}) {
  return (
    <View style={styles.content}>
      <SectionTitle>Customize</SectionTitle>
      <Card>
        <View style={styles.grid}>
          {CARD_COLORS.map((color) => (
            <Swatch
              key={color}
              color={color}
              selected={color === selected}
              onPress={() => onSelect(color)}
            />
          ))}
        </View>
      </Card>
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
  const gradient = useCardGradient(color);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={color}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      <View style={[styles.swatch, gradient]}>
        {selected && <SymbolView name="checkmark" size={22} tintColor={theme.text} />}
      </View>
    </Pressable>
  );
}

const SWATCH = 60;

const styles = StyleSheet.create({
  content: {
    paddingTop: SHEET_TOP_INSET,
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.two,
  },
  // Quarter-width cells rather than a gap: four to a row at any screen width.
  cell: {
    width: '25%',
    padding: Spacing.two,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  // Fixed, not `aspectRatio` off a percentage width: a cell wide enough to
  // clamp against `maxWidth` stretches the derived height and the circle ovals.
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
