import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/schema';
import { attributeIcon, type AttributeKind } from '@/lib/attribute-images';

export function ExerciseAttributeTiles({ exercise }: { exercise: Exercise }) {
  const tiles = (
    [
      ['level', exercise.level],
      ['category', exercise.category],
      ['equipment', exercise.equipment],
      ['muscle', exercise.primaryMuscles[0] ?? null],
    ] as [AttributeKind, string | null][]
  ).flatMap(([kind, value]) => {
    const icon = attributeIcon(kind, value);
    return icon && value ? [{ kind, value, icon }] : [];
  });

  if (tiles.length === 0) return null;

  return (
    <View style={styles.row}>
      {tiles.map((tile) => (
        <View key={tile.kind} style={styles.tile}>
          <Image source={tile.icon} style={styles.icon} contentFit="contain" />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={2}
            style={styles.label}>
            {tile.value}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  icon: {
    width: '100%',
    maxWidth: 88,
    aspectRatio: 1,
  },
  label: {
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
