import { Image, type ImageSource } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, SectionTitle } from '@/components/grouped-list';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { type CardColor } from '@/constants/card-colors';
import { CARD_POSES, type CardPose } from '@/constants/card-poses';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cardBackground } from '@/lib/card-backgrounds';
import * as haptics from '@/lib/haptics';
import { poseImage, templateCover } from '@/lib/template-images';

export function PosePicker({
  selected,
  color,
  primaryMuscles,
  onSelect,
}: {
  selected: CardPose | null;
  color: CardColor | null;
  primaryMuscles: readonly string[];
  onSelect: (pose: CardPose | null) => void;
}) {
  return (
    <>
      <SectionTitle>Image</SectionTitle>
      <Card>
        <View style={styles.grid}>
          <Tile
            source={templateCover(null, primaryMuscles)}
            color={color}
            label="Auto"
            accessibilityLabel="Automatic image"
            selected={selected === null}
            onPress={() => onSelect(null)}
          />
          {CARD_POSES.map((pose, index) => (
            <Tile
              key={pose}
              source={poseImage(pose)}
              color={color}
              accessibilityLabel={`Image ${index + 1}`}
              selected={pose === selected}
              onPress={() => onSelect(pose)}
            />
          ))}
        </View>
      </Card>
    </>
  );
}

function Tile({
  source,
  color,
  label,
  accessibilityLabel,
  selected,
  onPress,
}: {
  source: ImageSource;
  color: CardColor | null;
  label?: string;
  accessibilityLabel: string;
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
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      {/* The same layering as a card cover in grid-card.tsx, so a tile previews
          what the card will look like with the hue it already has. */}
      <View style={[styles.tile, selected && { borderColor: theme.accent }]}>
        <Image source={cardBackground(color)} style={StyleSheet.absoluteFill} contentFit="cover" />
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" />
        {label && (
          <View style={[styles.label, { backgroundColor: theme.surface }]}>
            <ThemedText type="smallBold">{label}</ThemedText>
          </View>
        )}
        {selected && (
          <View style={[styles.check, { backgroundColor: theme.accent }]}>
            <Icon name="checkmark" size={13} tintColor={theme.accentContent} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const BORDER = 2;
const CHECK = 24;

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: Spacing.two,
  },
  // Half-width cells rather than a gap: two to a row at any screen width.
  cell: {
    width: '50%',
    padding: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    aspectRatio: 4 / 3,
    borderRadius: Spacing.three,
    overflow: 'hidden',
    // Reserved on every tile, transparent until selected: adding the border on
    // selection would shrink the art and jump the whole grid.
    borderWidth: BORDER,
    borderColor: 'transparent',
  },
  label: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  check: {
    position: 'absolute',
    bottom: Spacing.one,
    right: Spacing.one,
    width: CHECK,
    height: CHECK,
    borderRadius: CHECK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
