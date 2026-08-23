import { useEffect, useRef, useState, type ReactElement } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutRectangle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Raised, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export type MenuItem = {
  key: string;
  label: string;
  destructive?: boolean;
  /** Marks the row the way a SwiftUI Picker's checkmark does on iOS. */
  selected?: boolean;
  /** Draws a divider above this row. */
  separated?: boolean;
  /** Makes this row open a nested level instead of firing. */
  items?: readonly MenuItem[];
  onPress?: () => void;
};

const ROW_HEIGHT = 44;
const MIN_WIDTH = 200;
const MAX_WIDTH = 280;
/** Kept clear of the screen edges, and of the trigger the popover hangs off. */
const MARGIN = Spacing.three;
const GAP = Spacing.one;

/**
 * The Android stand-in for every `@expo/ui/swift-ui` `Menu` in the app.
 *
 * Drawn here rather than handed to Compose's `DropdownMenu`, which arrives with
 * Material's shadow, corner radius, row metrics and font, and ships no checkmark
 * or disclosure glyph for a row — the old version stood in with literal `✓` and
 * `›` characters. Everything below reads from the same theme as the rest of the
 * app, so a menu looks like the cards it opens over.
 *
 * A `Modal` is what gets the popover out of its parent's clipping and above a
 * presented sheet, and it is mounted only while open. That is also what keeps
 * the set logger scrollable: the Compose version mounted a `Host` per trigger,
 * and reaching the RN trigger from inside one wraps it in its own root view
 * group and touch dispatcher with a Yoga round trip per layout pass — twenty of
 * those interop boundaries in one scroll view is the whole frame budget. At rest
 * this costs a `View`.
 *
 * Submenus are still pushed as levels behind a Back row rather than flown out
 * sideways: nesting is available now, but there is no room for a second popover
 * beside the first at phone width.
 */
export function Menu({
  open,
  title,
  items,
  onClose,
  style,
  children,
}: {
  open: boolean;
  title?: string;
  items: readonly MenuItem[];
  onClose: () => void;
  /** Sizes the trigger box; omit to let it match its content. */
  style?: StyleProp<ViewStyle>;
  children: ReactElement;
}) {
  const trigger = useRef<View>(null);
  const [path, setPath] = useState<readonly MenuItem[][]>([]);
  // Window coordinates, not the trigger's own: the popover lives in a `Modal`
  // and shares no layout with the view it anchors to.
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null);

  // Measured on every open rather than laid out once: a trigger inside a
  // scrolling set row is somewhere new each time.
  useEffect(() => {
    if (!open) return;
    trigger.current?.measureInWindow((x, y, width, height) =>
      setAnchor({ x, y, width, height }),
    );
  }, [open]);

  const level = path.at(-1) ?? items;

  const close = () => {
    setPath([]);
    setAnchor(null);
    onClose();
  };

  const press = (item: MenuItem) => {
    haptics.tap();
    const submenu = item.items;
    if (submenu) {
      setPath((levels) => [...levels, [...submenu]]);
      return;
    }
    close();
    item.onPress?.();
  };

  return (
    <View ref={trigger} style={style}>
      {children}

      {open && anchor !== null && (
        <Modal
          visible
          transparent
          statusBarTranslucent
          navigationBarTranslucent
          animationType="none"
          onRequestClose={close}>
          {/* No scrim: the iOS menus this stands in for do not dim the page. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />

          <Popover anchor={anchor}>
            {path.length > 0 && (
              <Row
                label="Back"
                color="textSecondary"
                leading="chevron.left"
                onPress={() => setPath((levels) => levels.slice(0, -1))}
              />
            )}

            {path.length === 0 && title != null && (
              <View style={styles.title}>
                <ThemedText type="small" themeColor="textSecondary">
                  {title}
                </ThemedText>
              </View>
            )}

            {level.map((item) => (
              <View key={item.key}>
                {item.separated && <Divider />}
                <Row
                  label={item.label}
                  color={item.destructive ? 'danger' : 'text'}
                  trailing={item.selected ? 'checkmark' : item.items ? 'chevron.right' : undefined}
                  onPress={() => press(item)}
                />
              </View>
            ))}
          </Popover>
        </Modal>
      )}
    </View>
  );
}

/**
 * The card, placed against the anchor: on whichever side of it has more room,
 * and hanging off the trigger's near edge so it grows away from the screen edge
 * the trigger sits closest to. Height is only ever bounded by the space it was
 * given, so a long facet list scrolls rather than running off the screen.
 */
function Popover({ anchor, children }: { anchor: LayoutRectangle; children: React.ReactNode }) {
  const theme = useTheme();
  const raised = Raised[useColorScheme()];
  const window = useWindowDimensions();

  const below = window.height - (anchor.y + anchor.height) >= anchor.y;
  const alignEnd = anchor.x + anchor.width / 2 > window.width / 2;

  const placement: ViewStyle = {
    ...(below
      ? { top: anchor.y + anchor.height + GAP }
      : { bottom: window.height - anchor.y + GAP }),
    ...(alignEnd
      ? { right: Math.max(MARGIN, window.width - (anchor.x + anchor.width)) }
      : { left: Math.max(MARGIN, anchor.x) }),
  };

  // On the `ScrollView` rather than the card: the card has no height of its own
  // to give it, and a `ScrollView` in a parent that sizes to content collapses.
  const room = (below ? window.height - (anchor.y + anchor.height) : anchor.y) - GAP - MARGIN;

  const grow = useSharedValue(0);
  useEffect(() => {
    grow.value = withTiming(1, { duration: 140 });
  }, [grow]);

  const animated = useAnimatedStyle(() => ({
    opacity: grow.value,
    transform: [{ scale: 0.95 + 0.05 * grow.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        raised,
        { backgroundColor: theme.surface },
        // Grows out of the trigger's corner, the way a UIMenu does.
        { transformOrigin: [alignEnd ? '100%' : '0%', below ? '0%' : '100%', 0] },
        placement,
        animated,
      ]}>
      <ScrollView
        style={{ maxHeight: room }}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}

function Row({
  label,
  color,
  leading,
  trailing,
  onPress,
}: {
  label: string;
  color: 'text' | 'danger' | 'textSecondary';
  leading?: 'chevron.left';
  trailing?: 'checkmark' | 'chevron.right';
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      {leading != null && <Icon name={leading} size={18} tintColor={theme[color]} />}
      <ThemedText style={styles.label} themeColor={color} numberOfLines={1}>
        {label}
      </ThemedText>
      {trailing != null && <Icon name={trailing} size={18} tintColor={theme[color]} />}
    </Pressable>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.backgroundElement }]} />;
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.one,
    overflow: 'hidden',
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  label: {
    flex: 1,
  },
  title: {
    minHeight: ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
  },
});
