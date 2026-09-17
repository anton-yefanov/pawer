import type { ReactNode } from 'react';
import { Switch, View } from 'react-native';

import { groupedStyles } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  leading?: ReactNode;
  /** Sits right after the label. */
  accessory?: ReactNode;
  value: boolean;
  onChange: (next: boolean) => void;
};

export function ToggleRow({ label, leading, accessory, value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={[groupedStyles.row, leading != null && groupedStyles.rowWithLeading]}>
      {leading}
      <View style={[groupedStyles.rowText, groupedStyles.labelWithAccessory]}>
        <ThemedText>{label}</ThemedText>
        {accessory}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: theme.backgroundSelected, true: theme.accent }}
      />
    </View>
  );
}
