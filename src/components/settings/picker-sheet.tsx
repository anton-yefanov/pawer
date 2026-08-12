import { StyleSheet, View } from 'react-native';

import { Card, PickRow, SectionFooter, SectionTitle, Separator } from '@/components/grouped-list';
import { SHEET_BOTTOM_INSET, SHEET_TOP_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';

type Option<T extends string> = { id: T; label: string; detail?: string };

export function PickerSheet<T extends string>({
  title,
  footer,
  options,
  selected,
  onSelect,
}: {
  title: string;
  footer?: string;
  options: readonly Option<T>[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <View style={styles.content}>
      <SectionTitle>{title}</SectionTitle>
      <Card>
        {options.map((option, index) => (
          <View key={option.id}>
            {index > 0 && <Separator />}
            <PickRow
              label={option.label}
              detail={option.detail}
              selected={option.id === selected}
              onPress={() => onSelect(option.id)}
            />
          </View>
        ))}
      </Card>
      {footer ? <SectionFooter>{footer}</SectionFooter> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: SHEET_TOP_INSET,
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.two,
  },
});
