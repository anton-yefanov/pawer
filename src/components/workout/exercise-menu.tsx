import { Button, Divider, Host, Image, Menu, Picker, Section, Text, ZStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, frame, shapes, tag } from '@expo/ui/swift-ui/modifiers';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/units';

const SIZE = 32;

export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180, 300] as const;

type Props = {
  restSeconds: number | null;
  defaultRestSeconds: number;
  onAddNote: () => void;
  onChangeRest: (seconds: number | null) => void;
  onRemove: () => void;
};

/**
 * Same structure as the exercise filter menu, and for the same reasons: the
 * `Host` is explicitly sized or it shrinks to the glyph, and the tap target has
 * to be grown *inside* the label with `frame` + `contentShape`, because a Menu's
 * button is exactly its label.
 */
export function ExerciseMenu({
  restSeconds,
  defaultRestSeconds,
  onAddNote,
  onChangeRest,
  onRemove,
}: Props) {
  const theme = useTheme();

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Host style={{ width: SIZE, height: SIZE }}>
        <Menu
          modifiers={[buttonStyle('plain')]}
          label={
            <ZStack modifiers={[frame({ width: SIZE, height: SIZE }), contentShape(shapes.rectangle())]}>
              <Image systemName="ellipsis" color={theme.textSecondary} />
            </ZStack>
          }>
          <Button systemImage="note.text" label="Add note" onPress={onAddNote} />

          <Section title="Rest timer">
            <Picker
              label="Rest timer"
              selection={String(restSeconds ?? 'default')}
              onSelectionChange={(value) =>
                onChangeRest(String(value) === 'default' ? null : Number(value))
              }>
              <Text modifiers={[tag('default')]}>
                Default ({formatDuration(defaultRestSeconds)})
              </Text>
              {REST_OPTIONS.map((seconds) => (
                <Text key={seconds} modifiers={[tag(String(seconds))]}>
                  {seconds === 0 ? 'Off' : formatDuration(seconds)}
                </Text>
              ))}
            </Picker>
          </Section>

          <Divider />
          <Button
            role="destructive"
            systemImage="trash"
            label="Remove exercise"
            onPress={onRemove}
          />
        </Menu>
      </Host>
    </View>
  );
}
