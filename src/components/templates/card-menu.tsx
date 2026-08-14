import { Button, Divider, Host, Image, Menu, ZStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'sf-symbols-typescript';

import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

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
 *
 * The glass disc is drawn here rather than left to iOS 26's shared header
 * background, which stays flat and grey until something interacts with it —
 * see `headerItem`.
 */
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

  return (
    <GlassCircle size={size} accessibilityLabel={accessibilityLabel}>
      <Host style={{ width: size, height: size }} ignoreSafeArea="all">
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={
            <ZStack
              modifiers={[frame({ width: size, height: size }), contentShape(shapes.rectangle())]}>
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
              // Even the destructive rows only tap: each one raises a confirm,
              // and that presentation is what carries the warning buzz.
              onPress={() => {
                haptics.tap();
                action.onPress();
              }}
            />,
          ])}
        </Menu>
      </Host>
    </GlassCircle>
  );
}
