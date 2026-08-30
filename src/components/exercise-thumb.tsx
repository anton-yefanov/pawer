import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { CIRCLE_BUTTON_SIZE } from "@/components/circle-button";
import { useTheme } from "@/hooks/use-theme";
import {
  ART_CORNER_SCALE,
  type ExerciseArt,
  exerciseThumbnail,
  reportMissingArt,
} from "@/lib/exercise-media";

export const EXERCISE_THUMB_SIZE = CIRCLE_BUTTON_SIZE;

/** Empty only for a custom exercise the user hasn't given a photo. */
export function ExerciseThumb({ art }: { art: ExerciseArt }) {
  const theme = useTheme();
  const thumb = exerciseThumbnail(art);

  return (
    <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
      {thumb && (
        <Image
          source={thumb}
          style={styles.image}
          contentFit="cover"
          onError={(error) => reportMissingArt(art, error)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: EXERCISE_THUMB_SIZE,
    height: EXERCISE_THUMB_SIZE,
    borderRadius: EXERCISE_THUMB_SIZE * ART_CORNER_SCALE,
    overflow: "hidden",
  },
  image: {
    flex: 1,
  },
});
