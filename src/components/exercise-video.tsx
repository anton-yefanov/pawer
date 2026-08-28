import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SHEET_INNER_RADIUS } from '@/constants/sheet';
import { useTheme } from '@/hooks/use-theme';
import { type ExerciseArt, exercisePoster, exerciseVideo } from '@/lib/exercise-media';
import { CLIP_ASPECT } from '@/lib/exercise-photos';

/** A custom exercise has no clip, only the photo the user picked, so the still
 *  underneath is the whole frame and no `VideoView` is ever mounted. */
export function ExerciseVideo({ art }: { art: ExerciseArt }) {
  const theme = useTheme();
  const poster = exercisePoster(art);
  const video = exerciseVideo(art.sourceId);
  const [firstFrame, setFirstFrame] = useState(false);

  const player = useVideoPlayer(video, (player) => {
    player.loop = true;
    player.muted = true;
    // The clips carry no audio track at all, but without this a silent demo
    // still claims the audio session and stops the user's music mid-set.
    player.audioMixingMode = 'mixWithOthers';
    player.play();
  });

  return (
    <View style={[styles.frame, { backgroundColor: theme.backgroundElement }]}>
      {poster && <Image source={poster} style={StyleSheet.absoluteFill} contentFit="cover" />}
      {video !== null && (
        <VideoView
          player={player}
          /* Mounted but transparent until it has a frame: an unmounted view
             never renders one, and a mounted one paints black before it does. */
          style={[StyleSheet.absoluteFill, { opacity: firstFrame ? 1 : 0 }]}
          contentFit="cover"
          nativeControls={false}
          allowsPictureInPicture={false}
          onFirstFrameRender={() => setFirstFrame(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: CLIP_ASPECT,
    borderRadius: SHEET_INNER_RADIUS,
    overflow: 'hidden',
  },
});
