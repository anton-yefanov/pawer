import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Menu } from '@/components/android/menu';
import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { Icon } from '@/components/icon';
import type { CardAction } from '@/components/templates/card-actions';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export function CardMenu({
  actions,
  accessibilityLabel,
  size = CIRCLE_BUTTON_SIZE,
}: {
  actions: readonly CardAction[];
  accessibilityLabel: string;
  size?: number;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <GlassCircle size={size} accessibilityLabel={accessibilityLabel}>
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
        }))}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={[styles.trigger, { width: size, height: size }]}>
          <Icon name="ellipsis" size={22} tintColor={theme.text} />
        </Pressable>
      </Menu>
    </GlassCircle>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
