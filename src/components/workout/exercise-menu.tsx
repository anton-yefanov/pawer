import {
  Button,
  DatePicker,
  Divider,
  Host,
  Image,
  Menu,
  Picker,
  Popover,
  Text,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  contentShape,
  datePickerStyle,
  frame,
  labelsHidden,
  shapes,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/units';

const SIZE = 32;

export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180] as const;

/** Tag for the row that clears the override and follows the app default. */
const DEFAULT = 'default';

/** The wheel is a time-of-day picker, so minutes ride on its hour column. */
const MINUTE_COLUMN_LIMIT = 24 * 60;

function toWheelDate(seconds: number) {
  const date = new Date(2000, 0, 1);
  date.setHours(Math.floor(seconds / 60), seconds % 60, 0, 0);
  return date;
}

const fromWheelDate = (date: Date) => date.getHours() * 60 + date.getMinutes();

type Props = {
  restSeconds: number | null;
  defaultRestSeconds: number;
  hasNote: boolean;
  onToggleNote: () => void;
  onChangeRest: (seconds: number | null) => void;
  onRemove: () => void;
};

/**
 * Same structure as the exercise filter menu, and for the same reasons: the
 * `Host` is explicitly sized or it shrinks to the glyph, and the tap target has
 * to be grown *inside* the label with `frame` + `contentShape`, because a Menu's
 * button is exactly its label.
 *
 * Custom rest opens a popover off the same host, which is why the Popover wraps
 * the Menu rather than sitting beside it — the ellipsis is the anchor.
 */
export function ExerciseMenu({
  restSeconds,
  defaultRestSeconds,
  hasNote,
  onToggleNote,
  onChangeRest,
  onRemove,
}: Props) {
  const theme = useTheme();
  const [customOpen, setCustomOpen] = useState(false);

  const effective = restSeconds ?? defaultRestSeconds;
  // A rest set from the wheel joins the list so it can carry the checkmark.
  const choices = Array.from(new Set<number>([...REST_OPTIONS, effective]))
    .filter((seconds) => seconds !== defaultRestSeconds && seconds < MINUTE_COLUMN_LIMIT)
    .sort((a, b) => a - b);

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      <Host style={{ width: SIZE, height: SIZE }} ignoreSafeArea="all">
        <Popover
          isPresented={customOpen}
          onIsPresentedChange={setCustomOpen}
          attachmentAnchor="bottom">
          <Popover.Trigger>
            <Menu
              modifiers={[buttonStyle('plain')]}
              label={
                <ZStack
                  modifiers={[
                    frame({ width: SIZE, height: SIZE }),
                    contentShape(shapes.rectangle()),
                  ]}>
                  <Image systemName="ellipsis" color={theme.textSecondary} />
                </ZStack>
              }>
              <Button
                systemImage={hasNote ? 'text.badge.minus' : 'note.text'}
                label={hasNote ? 'Remove note' : 'Add note'}
                onPress={onToggleNote}
              />

              <Menu label="Rest timers" systemImage="timer">
                <Picker
                  label="Rest timer"
                  selection={restSeconds === null ? DEFAULT : String(restSeconds)}
                  onSelectionChange={(value) =>
                    onChangeRest(String(value) === DEFAULT ? null : Number(value))
                  }>
                  <Text modifiers={[tag(DEFAULT)]}>{formatDuration(defaultRestSeconds)}</Text>
                  {choices.map((seconds) => (
                    <Text key={seconds} modifiers={[tag(String(seconds))]}>
                      {seconds === 0 ? 'Off' : formatDuration(seconds)}
                    </Text>
                  ))}
                </Picker>

                <Divider />
                <Button
                  systemImage="slider.horizontal.3"
                  label="Custom"
                  onPress={() => setCustomOpen(true)}
                />
              </Menu>

              <Divider />
              <Button
                role="destructive"
                systemImage="trash"
                label="Remove exercise"
                onPress={onRemove}
              />
            </Menu>
          </Popover.Trigger>

          <Popover.Content>
            <DatePicker
              selection={toWheelDate(effective)}
              displayedComponents={['hourAndMinute']}
              onDateChange={(date) => onChangeRest(fromWheelDate(date))}
              modifiers={[
                datePickerStyle('wheel'),
                labelsHidden(),
                frame({ width: 240, height: 160 }),
              ]}
            />
          </Popover.Content>
        </Popover>
      </Host>
    </View>
  );
}
