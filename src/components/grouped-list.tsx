import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { CardRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export const ROW_HEIGHT = 56;
export const TILE_SIZE = 29;

/** A leading tile sits as far from the row's edge as it does from its top. */
const TILE_MARGIN = (ROW_HEIGHT - TILE_SIZE) / 2;

/** Where a separator starts once every row in the card carries a tile. */
export const TILE_INSET = TILE_MARGIN + TILE_SIZE + Spacing.two;

const ROW_ICON_SIZE = 20;

/** Where a separator starts under `RowIcon`s: flush with the glyph, as Settings-style lists draw it. */
export const ROW_ICON_INSET = TILE_MARGIN + (TILE_SIZE - ROW_ICON_SIZE) / 2;

export function Card({ children, radius }: { children: ReactNode; radius?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[
        groupedStyles.card,
        { backgroundColor: theme.surface },
        radius != null && { borderRadius: radius },
      ]}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="footnote" weight="semibold" themeColor="textSecondary" style={groupedStyles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

export function SectionFooter({
  children,
  themeColor = 'textTertiary',
}: {
  children: ReactNode;
  themeColor?: ComponentProps<typeof ThemedText>['themeColor'];
}) {
  return (
    <ThemedText type="footnote" themeColor={themeColor} style={groupedStyles.sectionFooter}>
      {children}
    </ThemedText>
  );
}

/** A plain glyph in the tile's footprint, for lists that want line icons instead of coloured tiles. */
export function RowIcon({ name, loading = false }: { name: IconName; loading?: boolean }) {
  const theme = useTheme();
  return (
    <View style={groupedStyles.rowIcon}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <Icon name={name} size={ROW_ICON_SIZE} tintColor={theme.text} />
      )}
    </View>
  );
}

export function Separator({ inset = Spacing.three }: { inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={[groupedStyles.separator, { backgroundColor: theme.backgroundElement, marginLeft: inset }]}
    />
  );
}

export function DisclosureRow({
  label,
  detail,
  value,
  leading,
  chevron = true,
  onPress,
}: {
  label: string;
  detail?: string;
  value?: string;
  leading?: ReactNode;
  chevron?: boolean;
  /** Without it the row is read-only: not pressable and never shows a chevron. */
  onPress?: () => void;
}) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      <View style={groupedStyles.rowText}>
        <ThemedText>{label}</ThemedText>
        {detail && (
          <ThemedText type="footnote" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      {value && (
        <ThemedText themeColor="textTertiary" numberOfLines={1}>
          {value}
        </ThemedText>
      )}
      {chevron && onPress && (
        <Icon name="chevron.right" size={14} weight="semibold" tintColor={theme.chevron} />
      )}
    </>
  );

  const rowStyle = [groupedStyles.row, leading != null && groupedStyles.rowWithLeading];

  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [...rowStyle, pressed && { backgroundColor: theme.backgroundSelected }]}>
      {content}
    </Pressable>
  );
}

export function PickRow({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={({ pressed }) => [
        groupedStyles.row,
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <View style={groupedStyles.rowText}>
        <ThemedText>{label}</ThemedText>
        {detail && (
          <ThemedText type="footnote" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      {selected && <Icon name="checkmark" size={20} tintColor={theme.accent} />}
    </Pressable>
  );
}

export const groupedStyles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three,
    borderRadius: CardRadius,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  sectionTitle: {
    paddingHorizontal: Spacing.three * 2,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  sectionFooter: {
    paddingHorizontal: Spacing.three * 2,
    paddingTop: Spacing.two,
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowWithLeading: {
    paddingLeft: TILE_MARGIN,
  },
  rowText: {
    flex: 1,
  },
  labelWithAccessory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rowIcon: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
