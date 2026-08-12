import { Host, Menu, Picker, Text, ZStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  font,
  foregroundStyle,
  frame,
  shapes,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { SET_TYPE_KEYS, SET_TYPES, setTypeOf, type SetType } from '@/lib/set-types';

export const SET_TYPE_CELL = { width: 40, height: 30 } as const;

type Props = {
  label: string;
  setType: SetType;
  completed: boolean;
  onChange: (setType: SetType) => void;
};

/**
 * The Set column doubles as the set-type picker. Same sizing rules as the
 * exercise menu: the `Host` is explicitly sized or it shrinks to the glyph, and
 * the tap target has to be grown *inside* the label, because a Menu's button is
 * exactly its label.
 *
 * The pill stays an RN view — a marked set drops it so W/D read as a bare
 * coloured glyph.
 */
export function SetTypeMenu({ label, setType, completed, onChange }: Props) {
  const theme = useTheme();
  const { color } = SET_TYPES[setType];

  return (
    <View
      style={[
        styles.pill,
        setType === 'normal' && {
          backgroundColor: completed ? theme.successElement : theme.backgroundElement,
        },
      ]}>
      <Host style={styles.pill} ignoreSafeArea="all">
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={
            <ZStack
              modifiers={[frame(SET_TYPE_CELL), contentShape(shapes.rectangle())]}>
              <Text
                modifiers={[
                  foregroundStyle(theme[color]),
                  font({ size: 14, weight: setType === 'normal' ? 'medium' : 'bold' }),
                ]}>
                {label}
              </Text>
            </ZStack>
          }>
          <Picker
            label="Set type"
            selection={setType}
            onSelectionChange={(value) => onChange(setTypeOf(String(value)))}>
            {SET_TYPE_KEYS.map((key) => (
              <Text key={key} modifiers={[tag(key)]}>
                {SET_TYPES[key].label}
              </Text>
            ))}
          </Picker>
        </Menu>
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    ...SET_TYPE_CELL,
    borderRadius: 8,
  },
});
