import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { BadgeSpotlight, useBadgeSpotlight } from '@/components/achievements/badge-spotlight';
import { ExerciseAchievements } from '@/components/achievements/exercise-achievements';
import { Icon } from '@/components/icon';
import { SheetHeader } from '@/components/sheet-header';
import { ThemedText } from '@/components/themed-text';
import { CloseButton, HeaderPillButton } from '@/components/workout/workout-sheet-header';
import { SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAchievementNews } from '@/lib/achievement-news';
import { achievementSessionsQuery } from '@/lib/achievement-queries';
import { buildAchievements } from '@/lib/achievements';
import { track } from '@/lib/telemetry';
import { useWeightUnit } from '@/lib/weight-unit';

export default function AchievementsScreen() {
  const theme = useTheme();
  const unit = useWeightUnit();
  const { width } = useWindowDimensions();
  const [showLocked, setShowLocked] = useState(false);

  const { data } = useLiveQuery(achievementSessionsQuery(), []);
  const items = useMemo(() => buildAchievements(data ?? []), [data]);

  const news = useAchievementNews();
  const newKeys = useMemo(() => new Set(news.keys), [news.keys]);

  const earned = items.reduce((total, item) => total + item.unlocked, 0);
  const visible = showLocked ? items : items.filter((item) => item.unlocked > 0);

  const reported = useRef(false);
  useEffect(() => {
    if (reported.current || data == null) return;
    reported.current = true;
    track('achievements_opened', { unlocked: earned, exercises: items.length });
  }, [data, earned, items.length]);

  return (
    <BadgeSpotlight>
      <Header
        showLocked={showLocked}
        canToggle={items.length > 0}
        onToggle={() => setShowLocked((current) => !current)}
      />

      <ScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="trophy.fill" size={44} tintColor={theme.textSecondary} />
            <ThemedText type="footnote" themeColor="textSecondary" style={styles.emptyText}>
              {items.length === 0
                ? 'Log a workout and the badges you earn on every exercise show up here'
                : 'Nothing unlocked yet — Show All lists what each exercise you have trained is asking for'}
            </ThemedText>
          </View>
        ) : (
          visible.map((item) => (
            <ExerciseAchievements
              key={item.exerciseId}
              item={item}
              showLocked={showLocked}
              newKeys={newKeys}
              unit={unit}
              // The card's own padding is inside the page's, so the strip gets
              // what is left rather than measuring — see `BadgeStrip`.
              width={width - Spacing.three * 4}
            />
          ))
        )}
      </ScrollView>
    </BadgeSpotlight>
  );
}

/**
 * The sheet's own nav bar is the one thing the spotlight's backdrop can't cover
 * — it is a native header, above everything we draw — so while a badge is up it
 * carries the way out instead of the filter. A close button of our own, drawn
 * in the overlay, would sit under that bar and never see a touch.
 */
function Header({
  showLocked,
  canToggle,
  onToggle,
}: {
  showLocked: boolean;
  canToggle: boolean;
  onToggle: () => void;
}) {
  const spotlight = useBadgeSpotlight();

  return (
    <SheetHeader
      title="Achievements"
      right={
        spotlight.lifted != null ? (
          <CloseButton onPress={spotlight.close} />
        ) : canToggle ? (
          <HeaderPillButton title={showLocked ? 'Unlocked' : 'Show All'} onPress={onToggle} />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  emptyText: {
    textAlign: 'center',
  },
});
