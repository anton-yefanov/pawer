import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/circle-button';
import { FloatingContainer } from '@/components/floating-surface';
import { Card } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { SHEET_INNER_RADIUS } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CLIP_ASPECT, exercisePhotoSource } from '@/lib/exercise-photos';
import * as haptics from '@/lib/haptics';

const BUTTON_SIZE = 40;

/**
 * The photo a custom exercise is drawn from. Its frame is the clip aspect, so
 * what the sheet shows here is exactly what the detail screen will draw in place
 * of a seeded exercise's video.
 */
export function ExerciseThumbnailField({
  file,
  busy,
  onPick,
  onRemove,
}: {
  file: string | null;
  busy: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();

  return (
    <Card>
      <View style={styles.frame}>
        {file ? (
          <>
            <Image
              source={exercisePhotoSource(file)}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              recyclingKey={file}
            />
            <FloatingContainer spacing={Spacing.two} style={styles.buttons}>
              <CircleButton
                symbol="arrow.triangle.2.circlepath"
                symbolSize={18}
                size={BUTTON_SIZE}
                label="Replace thumbnail"
                onPress={onPick}
              />
              <CircleButton
                symbol="trash"
                symbolSize={18}
                size={BUTTON_SIZE}
                label="Remove thumbnail"
                feedback="press"
                onPress={onRemove}
              />
            </FloatingContainer>
          </>
        ) : (
          <Pressable
            onPress={() => {
              haptics.press();
              onPick();
            }}
            accessibilityRole="button"
            accessibilityLabel="Upload thumbnail"
            style={({ pressed }) => [
              styles.upload,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}>
            <ThemedText themeColor="accentContent" style={styles.uploadLabel}>
              Upload thumbnail
            </ThemedText>
          </Pressable>
        )}

        {busy && (
          <View style={[StyleSheet.absoluteFill, styles.busy, { backgroundColor: theme.scrim }]}>
            <ActivityIndicator color={theme.accentContent} />
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  frame: {
    aspectRatio: CLIP_ASPECT,
    borderRadius: SHEET_INNER_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadLabel: {
    fontWeight: 700,
  },
  upload: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 999,
  },
  buttons: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  busy: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
