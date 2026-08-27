import { Pressable, StyleSheet, View } from 'react-native';

import { Pill } from '@/components/exercises/pill';
import { type IconName } from '@/components/icon';
import { Spacing } from '@/constants/theme';
import * as haptics from '@/lib/haptics';

export type ExerciseTab = {
  id: string;
  label: string;
  icon: IconName;
  /** A tab that leaves the app instead of selecting: it never reads as active. */
  action?: () => void;
};

export function ExerciseTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly ExerciseTab[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = !tab.action && tab.id === value;

        return (
          <Pressable
            key={tab.id}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              haptics.select();
              if (tab.action) tab.action();
              else onChange(tab.id);
            }}>
            {({ pressed }) => (
              <Pill icon={tab.icon} label={tab.label} active={active} pressed={pressed} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
