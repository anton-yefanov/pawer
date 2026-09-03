import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CIRCLE_BUTTON_SIZE, CircleButton } from '@/components/circle-button';
import { useTheme } from '@/hooks/use-theme';
import { markDotSeen, useAchievementNews } from '@/lib/achievement-news';
import { attempt } from '@/lib/observability';

const DOT_SIZE = 10;
const RADIUS = CIRCLE_BUTTON_SIZE / 2;
/** Puts the dot's centre on the disc's edge, at 45 degrees. */
const DOT_INSET = RADIUS - RADIUS / Math.SQRT2 - DOT_SIZE / 2;

/** Home's way into the achievements sheet, beside the title. */
export function AchievementsButton() {
  const theme = useTheme();
  const news = useAchievementNews();

  return (
    <View>
      <CircleButton
        symbol="trophy.fill"
        label={news.dot ? 'Achievements, new' : 'Achievements'}
        onPress={() => {
          void attempt('settings', markDotSeen());
          router.push('/achievements');
        }}
      />

      {news.dot && (
        <View
          pointerEvents="none"
          style={[styles.dot, { backgroundColor: theme.accent }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Outside the glass rather than inside it: `CircleButton` deliberately has no
  // `overflow: 'hidden'`, and a dot clipped to the disc would be half eaten by
  // the interactive stretch.
  dot: {
    position: 'absolute',
    top: DOT_INSET,
    right: DOT_INSET,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
