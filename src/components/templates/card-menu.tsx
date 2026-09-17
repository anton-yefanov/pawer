import { Button, Divider, Host, Image, Menu, ZStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, frame, shapes } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';

import { CIRCLE_BUTTON_SIZE, GlassCircle } from '@/components/circle-button';
import { sfSymbol } from '@/components/icon';
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

/**
 * Same Host-sizing rules as ExerciseMenu: the Host is explicitly sized or it
 * shrinks to the glyph, and the tap target is grown *inside* the label, because
 * a Menu's button is exactly its label.
 *
 * The disc is drawn here rather than left to iOS 26's shared header background,
 * which stays flat and grey until something interacts with it — see
 * `headerItem`. In a header that disc is glass; on a card corner it is the flat
 * wash `CardMenuDisc` paints, which belongs to the artwork rather than floating
 * over it.
 */
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
  const onCover = size <= CARD_MENU_SIZE;
  const Disc = bare ? BareDisc : onCover ? CardMenuDisc : GlassCircle;
  const ink = bare ? theme.textSecondary : onCover ? CARD_MENU_INK : theme.text;

  return (
    <Disc size={size} accessibilityLabel={accessibilityLabel}>
      <Host style={{ width: size, height: size }} ignoreSafeArea="all">
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={
            <ZStack
              modifiers={[frame({ width: size, height: size }), contentShape(shapes.rectangle())]}
            >
              <Image
                systemName="ellipsis"
                color={ink}
                size={onCover && !bare ? 13 : undefined}
              />
            </ZStack>
          }
        >
          {actions.flatMap((action) => [
            ...(action.separated ? [<Divider key={`${action.label}-divider`} />] : []),
            <Button
              key={action.label}
              label={action.label}
              systemImage={sfSymbol(action.icon)}
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
    </Disc>
  );
}
