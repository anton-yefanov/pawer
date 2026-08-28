import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CIRCLE_BUTTON_SIZE } from '@/components/circle-button';
import { useTheme } from '@/hooks/use-theme';
import { exerciseThumbnail } from '@/lib/exercise-media';

export const EXERCISE_THUMB_SIZE = CIRCLE_BUTTON_SIZE;

/** `sourceId` is null for a custom exercise, which has no art to look up. */
export function ExerciseThumb({ sourceId }: { sourceId: string | null }) {
  const theme = useTheme();
  const thumb = exerciseThumbnail(sourceId);

  return (
    <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
      {thumb && <Image source={thumb} style={styles.image} contentFit="cover" />}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: EXERCISE_THUMB_SIZE,
    height: EXERCISE_THUMB_SIZE,
    borderRadius: EXERCISE_THUMB_SIZE / 2,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
});
