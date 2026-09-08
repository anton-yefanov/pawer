import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ICON_SIZE = 44;

export function EmptyState({
  icon,
  text,
  style,
  pointerEvents,
  children,
}: {
  icon: IconName;
  text: string;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: ViewProps['pointerEvents'];
  children?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.root, style]} pointerEvents={pointerEvents}>
      <Icon name={icon} size={ICON_SIZE} tintColor={theme.textSecondary} />
      <ThemedText type="footnote" themeColor="textSecondary" style={styles.text}>
        {text}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
  },
  text: { textAlign: 'center' },
});
