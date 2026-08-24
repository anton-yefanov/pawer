import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export const ROW_HEIGHT = 56;

export function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <View style={[groupedStyles.card, { backgroundColor: theme.surface }]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <ThemedText type="smallBold" themeColor="textSecondary" style={groupedStyles.sectionTitle}>
      {children}
    </ThemedText>
  );
}

export function SectionFooter({
  children,
  themeColor = 'textSecondary',
}: {
  children: ReactNode;
  themeColor?: ComponentProps<typeof ThemedText>['themeColor'];
}) {
  return (
    <ThemedText type="small" themeColor={themeColor} style={groupedStyles.sectionFooter}>
      {children}
    </ThemedText>
  );
}

export function Separator() {
  const theme = useTheme();
  return <View style={[groupedStyles.separator, { backgroundColor: theme.backgroundElement }]} />;
}

export function DisclosureRow({
  label,
  detail,
  value,
  chevron = true,
  onPress,
}: {
  label: string;
  detail?: string;
  value?: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        groupedStyles.row,
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <View style={groupedStyles.rowText}>
        <ThemedText>{label}</ThemedText>
        {detail && (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      {value && (
        <ThemedText themeColor="textSecondary" numberOfLines={1}>
          {value}
        </ThemedText>
      )}
      {chevron && <Icon name="chevron.right" size={16} tintColor={theme.textSecondary} />}
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
          <ThemedText type="small" themeColor="textSecondary">
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
    borderRadius: Spacing.three,
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
  rowText: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three,
  },
});
