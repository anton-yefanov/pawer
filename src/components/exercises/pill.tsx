import { StyleSheet, View } from 'react-native';

import { Glyph, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The sheet's one control shape: a full capsule carrying a monoline glyph and a
 * label. Drawn as a plain view so the thing that makes it interactive — a
 * Pressable for a tab, a native menu's trigger for the period — can wrap it
 * without either of them owning the look.
 */
export function Pill({
  icon,
  label,
  active,
  raised,
  trailing,
  pressed,
  onLayout,
}: {
  icon: IconName;
  label: string;
  active?: boolean;
  /** A pill on the grey page rather than inside a card, where `backgroundElement` all but vanishes. */
  raised?: boolean;
  trailing?: IconName;
  pressed?: boolean;
  onLayout?: React.ComponentProps<typeof View>['onLayout'];
}) {
  const theme = useTheme();
  const tint = active ? theme.text : theme.textSecondary;

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.pill,
        {
          backgroundColor: active
            ? theme.backgroundSelected
            : raised
              ? theme.surface
              : theme.backgroundElement,
          opacity: pressed ? 0.6 : 1,
        },
      ]}>
      <Glyph name={icon} size={17} color={tint} />
      <ThemedText style={[styles.label, { color: tint }]}>{label}</ThemedText>
      {trailing && <Glyph name={trailing} size={13} color={theme.textSecondary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
    // A full capsule, not a rounded rectangle — the height is what sets the radius.
    borderRadius: 999,
  },
  label: {
    fontWeight: 600,
  },
});
