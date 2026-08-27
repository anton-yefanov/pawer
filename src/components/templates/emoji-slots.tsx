import { Pressable, StyleSheet, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { Icon } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_EMOJI } from '@/lib/card-artwork';
import * as haptics from '@/lib/haptics';

/**
 * The three artwork slots under the customize preview. Slots fill left to
 * right: the first empty one is the add button and the rest are inert, so the
 * emoji on a cover are always the ones in the row, in order.
 */
export function EmojiSlots({
  emojis,
  onPick,
  onRemove,
}: {
  emojis: readonly string[];
  onPick: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <View style={styles.row}>
      {Array.from({ length: MAX_EMOJI }, (_, index) => (
        <Slot
          key={index}
          emoji={emojis[index]}
          addable={index === emojis.length}
          onPick={() => onPick(index)}
          onRemove={() => onRemove(index)}
        />
      ))}
    </View>
  );
}

function Slot({
  emoji,
  addable,
  onPick,
  onRemove,
}: {
  emoji: string | undefined;
  addable: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const enabled = emoji !== undefined || addable;

  return (
    <View>
      <Pressable
        onPress={() => {
          haptics.select();
          onPick();
        }}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={emoji ? `Replace ${emoji}` : 'Add emoji'}
        style={({ pressed }) => [
          styles.slot,
          { backgroundColor: theme.backgroundElement },
          !enabled && styles.inert,
          pressed && styles.pressed,
        ]}>
        {emoji ? (
          <Emoji value={emoji} size={GLYPH} />
        ) : (
          addable && <Icon name="plus" size={24} tintColor={theme.textSecondary} />
        )}
      </Pressable>
      {emoji && (
        <Pressable
          onPress={() => {
            haptics.select();
            onRemove();
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${emoji}`}
          hitSlop={Spacing.two}
          style={[styles.remove, { backgroundColor: theme.textSecondary }]}>
          <Icon name="xmark" size={11} tintColor={theme.surface} />
        </Pressable>
      )}
    </View>
  );
}

const SLOT = 72;
const GLYPH = 34;
const BADGE = 20;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  slot: {
    width: SLOT,
    height: SLOT,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inert: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  // Overhangs the slot's corner rather than sitting inside it, so it never
  // crowds a wide emoji.
  remove: {
    position: 'absolute',
    top: -Spacing.one,
    right: -Spacing.one,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
