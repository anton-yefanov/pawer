import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { Menu } from '@/components/android/menu';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { SET_TYPE_KEYS, SET_TYPES, type SetType } from '@/lib/set-types';

export const SET_TYPE_CELL = { width: 40, height: 30 } as const;

type Props = {
  label: string;
  setType: SetType;
  completed: boolean;
  onChange: (setType: SetType) => void;
};

/** The Set column doubles as the set-type picker, same as on iOS — the pill is
 *  the trigger and the choices arrive in the platform's dropdown menu. */
export function SetTypeMenu({ label, setType, completed, onChange }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <Menu
      open={open}
      title="Set type"
      onClose={() => setOpen(false)}
      style={SET_TYPE_CELL}
      items={SET_TYPE_KEYS.map((key) => ({
        key,
        label: SET_TYPES[key].label,
        selected: key === setType,
        onPress: () => onChange(key),
      }))}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Set type"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.pill,
          setType === 'normal' && {
            backgroundColor: completed ? theme.successElement : theme.backgroundElement,
          },
          pressed && { opacity: 0.6 },
        ]}>
        <ThemedText
          type={setType === 'normal' ? 'small' : 'smallBold'}
          themeColor={SET_TYPES[setType].color}>
          {label}
        </ThemedText>
      </Pressable>
    </Menu>
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
