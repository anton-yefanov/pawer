import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The sheet is `surface` throughout, so a section here is a titled block with
 * hairline rules — not a raised white card, which would read as nothing at all
 * against the white behind it.
 */
export function ExerciseSection({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText type="footnote" weight="semibold" themeColor="textSecondary">
          {title}
        </ThemedText>
        {trailing}
      </View>
      {children}
    </View>
  );
}

/** `spaced` for a divider between padded rows, where a flush rule reads tight. */
export function SectionRule({ spaced }: { spaced?: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.rule,
        spaced && styles.ruleSpaced,
        { backgroundColor: theme.backgroundElement },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 20,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  ruleSpaced: {
    marginVertical: Spacing.one,
  },
});
