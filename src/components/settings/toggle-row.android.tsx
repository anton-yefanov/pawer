import type { ReactNode } from 'react';
import { Switch, View } from 'react-native';

import { groupedStyles } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import * as haptics from '@/lib/haptics';

type Props = {
  label: string;
  leading?: ReactNode;
  value: boolean;
  onChange: (next: boolean) => void;
};

/** RN's `Switch` is already the Material 3 switch on Android — no host needed. */
export function ToggleRow({ label, leading, value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={[groupedStyles.row, leading != null && groupedStyles.rowWithLeading]}>
      {leading}
      <View style={groupedStyles.rowText}>
        <ThemedText>{label}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={(next) => {
          haptics.select();
          onChange(next);
        }}
        accessibilityLabel={label}
        thumbColor={value ? theme.accentContent : undefined}
        trackColor={{ false: theme.backgroundSelected, true: theme.success }}
      />
    </View>
  );
}
