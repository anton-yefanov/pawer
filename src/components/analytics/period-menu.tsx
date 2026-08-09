import { HStack, Host, Menu, Picker, Spacer, Text } from '@expo/ui/swift-ui';
import { buttonStyle, foregroundStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { PERIODS, periodLabel, type PeriodId } from '@/lib/analytics-period';
import { useTheme } from '@/hooks/use-theme';

/**
 * Native `UIMenu` over the period presets — a Picker inside a Menu renders as
 * checkmarked rows, so the current period is readable without opening it.
 * Seven options is past what a segmented control can carry.
 *
 * The host takes the row's leftover width rather than a fixed one, and a
 * `Spacer` pushes the label to the trailing edge: a host sized to a guess
 * truncates the longest preset ("Last 180 days") until SwiftUI re-lays-out, and
 * leaves the label floating mid-row in the meantime.
 */
export function PeriodMenu({
  value,
  onChange,
}: {
  value: PeriodId;
  onChange: (next: PeriodId) => void;
}) {
  const theme = useTheme();

  return (
    <Host style={styles.host}>
      <HStack>
        <Spacer />
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={<Text modifiers={[foregroundStyle(theme.accent)]}>{periodLabel(value)}</Text>}>
          <Picker
            label="Period"
            selection={value}
            onSelectionChange={(next) => onChange(String(next) as PeriodId)}>
            {PERIODS.map((period) => (
              <Text key={period.id} modifiers={[tag(period.id)]}>
                {period.label}
              </Text>
            ))}
          </Picker>
        </Menu>
      </HStack>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
    height: 34,
  },
});
