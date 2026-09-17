import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Menu } from '@/components/android/menu';
import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { Icon } from '@/components/icon';
import type { CardAction } from '@/components/templates/card-actions';
import {
  CARD_MENU_INK,
  CARD_MENU_SIZE,
  CardMenuDisc,
} from '@/components/templates/card-menu-disc';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export { CARD_MENU_SIZE };

function BareDisc({
  accessibilityLabel,
  children,
}: {
  size: number;
  accessibilityLabel?: string;
  children: React.ReactNode;
}) {
  return <View accessibilityLabel={accessibilityLabel}>{children}</View>;
}

export function CardMenu({
  actions,
  accessibilityLabel,
  size = CIRCLE_BUTTON_SIZE,
  bare,
}: {
  actions: readonly CardAction[];
  accessibilityLabel: string;
  size?: number;
  /** No disc: a secondary-ink glyph straight on a card, like a list header's. */
  bare?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const onCover = size <= CARD_MENU_SIZE;
  const Disc = bare ? BareDisc : onCover ? CardMenuDisc : GlassCircle;
  const ink = bare ? theme.textSecondary : onCover ? CARD_MENU_INK : theme.text;

  return (
    <Disc size={size} accessibilityLabel={accessibilityLabel}>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        style={{ width: size, height: size }}
        items={actions.map((action) => ({
          key: action.label,
          label: action.label,
          destructive: action.destructive,
          separated: action.separated,
          // Even the destructive rows only tap: each one raises a confirm, and
          // that presentation is what carries the warning buzz.
          onPress: () => {
            haptics.tap();
            action.onPress();
          },
        }))}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={[styles.trigger, { width: size, height: size }]}
        >
          <Icon
            name="ellipsis"
            size={onCover && !bare ? 16 : 22}
            tintColor={ink}
          />
        </Pressable>
      </Menu>
    </Disc>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
