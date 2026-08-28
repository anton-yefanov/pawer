import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

export type ArtworkMode = 'exercises' | 'emoji' | 'media';

const TABS: readonly { mode: ArtworkMode; label: string }[] = [
  { mode: 'exercises', label: 'Exercises' },
  { mode: 'emoji', label: 'Emojis' },
  { mode: 'media', label: 'Media' },
];

/** Picks which of the three sources the cover draws from, and so what the
 *  customize sheet's body offers. Each tab keeps its own draft, so switching
 *  away and back loses nothing. */
export function ArtworkTabs({
  mode,
  onChange,
}: {
  mode: ArtworkMode;
  onChange: (mode: ArtworkMode) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const selected = tab.mode === mode;
        return (
          <Pressable
            key={tab.mode}
            onPress={() => {
              haptics.select();
              onChange(tab.mode);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: selected ? theme.accent : 'transparent',
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" themeColor={selected ? 'accent' : 'text'}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const BORDER = 1;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  pill: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: BORDER,
  },
  pressed: {
    opacity: 0.7,
  },
});
