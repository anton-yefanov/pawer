import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionTitle } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { CARD_COLORS, isDarkCardColor, type CardColor } from '@/constants/card-colors';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cardBackground } from '@/lib/card-backgrounds';
import * as haptics from '@/lib/haptics';

export function ColorPicker({
  selected,
  onSelect,
}: {
  selected: CardColor;
  onSelect: (color: CardColor) => void;
}) {
  return (
    <>
      <SectionTitle>Color</SectionTitle>
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
    </>
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
      <View style={styles.swatch}>
        <Image source={cardBackground(color)} style={styles.crop} contentFit="cover" />
        {selected && (
          <Icon
            name="checkmark"
            size={22}
            tintColor={isDarkCardColor(color) ? theme.accentContent : theme.text}
          />
        )}
      </View>
    </Pressable>
  );
}

const SWATCH = 60;

// The covers are a burst radiating from a flat centre, so a whole one shrunk to
// 60pt reads as a plain circle. Show an off-centre crop instead: the rays are
// what distinguishes one swatch from the next at this size.
const CROP = SWATCH * 2.6;
const CROP_OFFSET = -(CROP - SWATCH) / 2 - CROP * 0.18;

const styles = StyleSheet.create({
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
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crop: {
    position: 'absolute',
    width: CROP,
    height: CROP,
    left: CROP_OFFSET,
    top: CROP_OFFSET,
  },
});
