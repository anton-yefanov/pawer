import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { SET_TYPE_KEYS, SET_TYPES, type SetType } from '@/lib/set-types';

export const SET_TYPE_CELL = { width: 40, height: 30 } as const;

/** No SwiftUI menu on web — the cell cycles through the types instead. */
export function SetTypeMenu({
  label,
  setType,
  completed,
  onChange,
}: {
  label: string;
  setType: SetType;
  completed: boolean;
  onChange: (setType: SetType) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel="Set type"
      onPress={() =>
        onChange(SET_TYPE_KEYS[(SET_TYPE_KEYS.indexOf(setType) + 1) % SET_TYPE_KEYS.length])
      }
      style={[
        styles.pill,
        setType === 'normal' && {
          backgroundColor: completed ? theme.successElement : theme.backgroundElement,
        },
      ]}>
      <ThemedText
        type={setType === 'normal' ? 'small' : 'smallBold'}
        themeColor={SET_TYPES[setType].color}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    ...SET_TYPE_CELL,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
