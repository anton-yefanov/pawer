import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { ThemedText } from '@/components/themed-text';
import { BodyMap } from '@/components/workout/body-map';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';
import {
  muscleHitsQuery,
  readinessByGroup,
  recoveryByGroup,
  recoveryCaption,
} from '@/lib/muscle-recovery';

const PADDING = Spacing.three;
const HEADER_HEIGHT = 20;
const CAPTION_HEIGHT = 18;
const GAP = Spacing.two;
const FIGURES_HEIGHT = 186;

/**
 * Fixed rather than measured: the mascot beside it is sized off this height,
 * and the figures fit whatever box is left over, so the two agree without a
 * layout pass.
 */
export const RECOVERY_CARD_HEIGHT =
  PADDING * 2 + HEADER_HEIGHT + GAP + FIGURES_HEIGHT + GAP + CAPTION_HEIGHT;

export function MuscleRecoveryCard({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const now = useNow();
  const { data } = useLiveQuery(muscleHitsQuery(), []);
  const groups = recoveryByGroup(data ?? [], now);
  const readiness = readinessByGroup(groups);
  const caption = recoveryCaption(groups, now);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Muscle recovery"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.surface },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.title} numberOfLines={1}>
          Recovery
        </ThemedText>
        <Icon name="chevron.right" size={12} tintColor={theme.textSecondary} />
      </View>

      <View style={styles.figures}>
        <View style={styles.figure}>
          <BodyMap view="front" readiness={readiness} />
        </View>
        <View style={styles.figure}>
          <BodyMap view="back" readiness={readiness} />
        </View>
      </View>

      <View style={styles.caption}>
        <ThemedText style={styles.captionLabel} numberOfLines={1}>
          {caption.label}
        </ThemedText>
        {caption.countdown && (
          <ThemedText style={styles.captionValue} themeColor="textSecondary">
            {caption.countdown}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: RECOVERY_CARD_HEIGHT,
    borderRadius: 18,
    padding: PADDING,
    gap: GAP,
  },
  pressed: {
    opacity: 0.7,
  },
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  title: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  figures: {
    height: FIGURES_HEIGHT,
    flexDirection: 'row',
    gap: Spacing.two,
  },
  figure: {
    flex: 1,
  },
  caption: {
    height: CAPTION_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  captionLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  captionValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
