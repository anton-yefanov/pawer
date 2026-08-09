import { Button, Divider, Host, Image, Menu, ZStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol } from 'sf-symbols-typescript';

import { useTheme } from '@/hooks/use-theme';

const SIZE = 32;

export type CardAction = {
  label: string;
  systemImage: SFSymbol;
  destructive?: boolean;
  /** Draws a divider above this row. */
  separated?: boolean;
  onPress: () => void;
};

/**
 * Same Host-sizing rules as ExerciseMenu: the Host is explicitly sized or it
 * shrinks to the glyph, and the tap target is grown *inside* the label, because
 * a Menu's button is exactly its label.
 */
export function CardMenu({
  actions,
  accessibilityLabel,
}: {
  actions: readonly CardAction[];
  accessibilityLabel: string;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[styles.backing, { backgroundColor: theme.surface }]}>
      <Host style={styles.host}>
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={
            <ZStack
              modifiers={[frame({ width: SIZE, height: SIZE }), contentShape(shapes.rectangle())]}>
              <Image systemName="ellipsis" color={theme.text} />
            </ZStack>
          }>
          {actions.flatMap((action) => [
            ...(action.separated ? [<Divider key={`${action.label}-divider`} />] : []),
            <Button
              key={action.label}
              label={action.label}
              systemImage={action.systemImage}
              role={action.destructive ? 'destructive' : undefined}
              onPress={action.onPress}
            />,
          ])}
        </Menu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  backing: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    opacity: 0.9,
    overflow: 'hidden',
  },
  host: {
    width: SIZE,
    height: SIZE,
  },
});
