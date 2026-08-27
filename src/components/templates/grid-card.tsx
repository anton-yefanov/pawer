import { Pressable, StyleSheet, View } from 'react-native';

import { CardCover } from '@/components/templates/card-cover';
import { ThemedText } from '@/components/themed-text';
import { type CardColor } from '@/constants/card-colors';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

/** The shell shared by template and folder cards. */
export function GridCard({
  cover,
  color,
  title,
  subtitle,
  onPress,
  width,
}: {
  cover: React.ReactNode;
  color: CardColor | null;
  title: string;
  subtitle?: string;
  onPress: () => void;
  width: number;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { width, backgroundColor: theme.surface }]}>
      <Pressable
        onPress={() => {
          haptics.tap();
          onPress();
        }}
        style={({ pressed }) => [pressed && styles.pressed]}>
        <View style={styles.cover}>
          <CardCover color={color} />
          {cover}
        </View>
        <View style={styles.body}>
          <ThemedText numberOfLines={1}>{title}</ThemedText>
          {/* Always two lines tall, even when empty: reordering slides cards
              between slots, which only works if every slot is the same size. */}
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={SUBTITLE_LINES}
            style={styles.subtitle}>
            {subtitle ?? ''}
          </ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Every card slot reserves its drop-highlight border up front, transparent
 * until a folder is receiving. Adding the border only while receiving would
 * shrink the fixed-width content box by 4pt and shift the card mid-drag.
 */
export const CARD_BORDER = 2;

export const cardSlot = {
  borderWidth: CARD_BORDER,
  borderColor: 'transparent',
  borderRadius: 14 + CARD_BORDER,
} as const;

const TITLE_LINE = 24;
const SUBTITLE_LINE = 20;
const SUBTITLE_LINES = 2;
/** Cover height as a fraction of card width — what artwork sizes itself against. */
export const COVER_RATIO = 3 / 4;
const BODY_HEIGHT = Spacing.two * 2 + TITLE_LINE + Spacing.one + SUBTITLE_LINE * SUBTITLE_LINES;

/** Height of a whole slot, border included, for a given slot width. */
export function slotHeight(width: number): number {
  const card = width - CARD_BORDER * 2;
  return card * COVER_RATIO + BODY_HEIGHT + CARD_BORDER * 2;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: Spacing.one,
    padding: Spacing.two,
  },
  subtitle: {
    height: SUBTITLE_LINE * SUBTITLE_LINES,
  },
});
