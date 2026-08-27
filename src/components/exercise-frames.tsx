import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { SHEET_INNER_RADIUS } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exerciseFrames } from '@/lib/exercise-images';

export function ExerciseFrames({ sourceId }: { sourceId: string | null }) {
  const theme = useTheme();
  const frames = exerciseFrames(sourceId);

  return (
    <View style={styles.row}>
      {frames.map((frame, i) => (
        <View key={i} style={[styles.frame, { backgroundColor: theme.backgroundElement }]}>
          {frame ? <Image source={frame} style={styles.image} contentFit="cover" /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  frame: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: SHEET_INNER_RADIUS,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
});
