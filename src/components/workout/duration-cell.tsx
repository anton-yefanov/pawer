import { Button, HStack, Host, Picker, Popover, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  clipped,
  contentShape,
  font,
  foregroundColor,
  frame,
  labelsHidden,
  padding,
  pickerStyle,
  shapes,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { View } from 'react-native';

import { useDebouncedWrite } from '@/hooks/use-debounced-write';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/units';

const CELL_HEIGHT = 32;
const COLUMN_WIDTH = 58;
const WHEEL_HEIGHT = 150;

/** Long enough for any set anyone logs, short enough to keep the wheel scrollable. */
const MAX_HOURS = 12;

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

const HOURS = range(MAX_HOURS);
const SIXTY = range(60);

type Props = {
  seconds: number | null;
  /** The previous session's time, shown as ghost text while the cell is empty. */
  placeholder: number | null;
  width: number;
  highlighted: boolean;
  completed: boolean;
  onEdit: (seconds: number) => void;
  onCommit: (seconds: number) => void;
};

/**
 * Time is picked on a wheel rather than typed. A keypad would force the user to
 * think in a digit-fill convention (`145` meaning 1:45) that nothing on screen
 * teaches, and a number pad has no return key to get back out of.
 *
 * The wheel writes through the same 400 ms debounce the typed cells use — a spin
 * crosses a lot of detents and each one would otherwise wake every live query on
 * the screen. `draft` carries the spun value until that write lands, so the wheel
 * never snaps back to the row it came from.
 */
export function DurationCell({
  seconds,
  placeholder,
  width,
  highlighted,
  completed,
  onEdit,
  onCommit,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  // Three wheels are 130-odd SwiftUI views and every duration set on the screen
  // has a cell, so they are built on the first tap rather than up front, and kept
  // after that. Presenting a frame later is what gives them one to be built in.
  const [built, setBuilt] = useState(false);
  const [draft, setDraft] = useState<number | null>(null);
  const write = useDebouncedWrite(onCommit);

  const value = draft ?? seconds;
  const total = value ?? 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;

  const change = (next: number) => {
    setDraft(next);
    onEdit(next);
    write.push(next);
  };

  const fill = highlighted
    ? theme.dangerHighlight
    : completed
      ? theme.successElement
      : theme.backgroundElement;

  const label = value ?? placeholder;

  return (
    <View style={{ width, height: CELL_HEIGHT }}>
      <Host style={{ width, height: CELL_HEIGHT }} ignoreSafeArea="all">
        <Popover
          isPresented={open}
          // No `attachmentAnchor`: the default anchors the whole cell rect, and
          // UIKit then places the wheels above or below it, whichever has room.
          // Anchoring a single point lets it land on top of the cell instead.
          onIsPresentedChange={(presented) => {
            setOpen(presented);
            if (!presented) write.flush();
          }}>
          <Popover.Trigger>
            <Button
              modifiers={[buttonStyle('plain')]}
              onPress={() => {
                setBuilt(true);
                requestAnimationFrame(() => setOpen(true));
              }}>
              <ZStack
                modifiers={[
                  frame({ width, height: CELL_HEIGHT }),
                  background(fill, shapes.roundedRectangle({ cornerRadius: 8 })),
                  contentShape(shapes.rectangle()),
                ]}>
                <Text
                  modifiers={[
                    font({ size: 16 }),
                    foregroundColor(value == null ? theme.textSecondary : theme.text),
                  ]}>
                  {label == null ? ' ' : formatDuration(label)}
                </Text>
              </ZStack>
            </Button>
          </Popover.Trigger>

          <Popover.Content>
            <HStack spacing={0} modifiers={[padding({ vertical: 8 })]}>
              {built && (
                <Wheel
                  unit="hr"
                  values={HOURS}
                  selection={hours}
                  onChange={(next) => change(next * 3600 + minutes * 60 + (total % 60))}
                />
              )}
              {built && (
                <Wheel
                  unit="min"
                  values={SIXTY}
                  selection={minutes}
                  onChange={(next) => change(hours * 3600 + next * 60 + (total % 60))}
                />
              )}
              {built && (
                <Wheel
                  unit="sec"
                  values={SIXTY}
                  selection={total % 60}
                  onChange={(next) => change(hours * 3600 + minutes * 60 + next)}
                />
              )}
            </HStack>
          </Popover.Content>
        </Popover>
      </Host>
    </View>
  );
}

function Wheel({
  unit,
  values,
  selection,
  onChange,
}: {
  unit: string;
  values: number[];
  selection: number;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();

  return (
    <VStack spacing={0}>
      <Text modifiers={[font({ size: 12 }), foregroundColor(theme.textSecondary)]}>{unit}</Text>
      <Picker
        selection={selection}
        onSelectionChange={onChange}
        modifiers={[
          pickerStyle('wheel'),
          labelsHidden(),
          frame({ width: COLUMN_WIDTH, height: WHEEL_HEIGHT }),
          clipped(),
        ]}>
        {values.map((value) => (
          <Text key={value} modifiers={[tag(value)]}>
            {String(value).padStart(2, '0')}
          </Text>
        ))}
      </Picker>
    </VStack>
  );
}
