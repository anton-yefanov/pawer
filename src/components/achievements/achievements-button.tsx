import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CircleButton } from '@/components/circle-button';
import { useTheme } from '@/hooks/use-theme';
import { markDotSeen, useAchievementNews } from '@/lib/achievement-news';
import { attempt } from '@/lib/observability';

const DOT_SIZE = 12;

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
          style={[styles.dot, { backgroundColor: theme.accent, borderColor: theme.background }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Outside the glass rather than inside it: `CircleButton` deliberately has no
  // `overflow: 'hidden'`, and a dot on the disc's own edge would be half eaten
  // by the interactive stretch.
  dot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
});
