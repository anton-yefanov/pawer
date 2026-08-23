import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/schema';
import { attributeIcon, type AttributeKind } from '@/lib/attribute-images';

const KIND_LABEL: Record<AttributeKind, string> = {
  level: 'Level',
  category: 'Type',
  equipment: 'Equipment',
  muscle: 'Muscle',
};

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
          <View style={styles.caption}>
            <ThemedText themeColor="textSecondary" numberOfLines={1} style={styles.kind}>
              {KIND_LABEL[tile.kind]}
            </ThemedText>
            <ThemedText type="smallBold" numberOfLines={2} style={styles.value}>
              {tile.value}
            </ThemedText>
          </View>
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
  caption: {
    alignItems: 'center',
  },
  kind: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  value: {
    textAlign: 'center',
    textTransform: 'capitalize',
  },
});
