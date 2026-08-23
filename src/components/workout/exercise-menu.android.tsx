import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Menu, type MenuItem } from '@/components/android/menu';
import { Wheel } from '@/components/android/wheel';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/units';

const SIZE = 32;

export const REST_OPTIONS = [0, 30, 45, 60, 90, 120, 180] as const;

/** Rest longer than this isn't rest any more, and it keeps the wheels short. */
const MAX_REST_MINUTES = 30;

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

type Props = {
  restSeconds: number | null;
  defaultRestSeconds: number;
  hasNote: boolean;
  inSuperset: boolean;
  /** The other exercises this one can be supersetted with, its own group aside. */
  candidates: readonly { id: string; name: string }[];
  onToggleNote: () => void;
  onChangeRest: (seconds: number | null) => void;
  onJoinSuperset: (targetRowId: string) => void;
  onLeaveSuperset: () => void;
  onRemove: () => void;
};

/**
 * The iOS menu's two submenus become two pushed levels of the dropdown, and its
 * custom-rest popover becomes a dialog — a popover anchored to a 32pt glyph has
 * no Material counterpart, and the wheels need more width than one would give
 * them anyway.
 */
export function ExerciseMenu({
  restSeconds,
  defaultRestSeconds,
  hasNote,
  inSuperset,
  candidates,
  onToggleNote,
  onChangeRest,
  onJoinSuperset,
  onLeaveSuperset,
  onRemove,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);

  const effective = restSeconds ?? defaultRestSeconds;
  // A rest set from the wheel joins the list so it can carry the checkmark.
  const choices = Array.from(new Set<number>([...REST_OPTIONS, effective]))
    .filter((seconds) => seconds !== defaultRestSeconds)
    .sort((a, b) => a - b);

  const items: MenuItem[] = [
    {
      key: 'note',
      label: hasNote ? 'Remove note' : 'Add note',
      onPress: onToggleNote,
    },
    {
      key: 'rest',
      label: 'Rest timers',
      items: [
        {
          key: 'rest-default',
          label: formatDuration(defaultRestSeconds),
          selected: restSeconds === null,
          onPress: () => onChangeRest(null),
        },
        ...choices.map((seconds) => ({
          key: `rest-${seconds}`,
          label: seconds === 0 ? 'Off' : formatDuration(seconds),
          selected: restSeconds === seconds,
          onPress: () => onChangeRest(seconds),
        })),
        {
          key: 'rest-custom',
          label: 'Custom',
          separated: true,
          onPress: () => setCustomOpen(true),
        },
      ],
    },
  ];

  if (candidates.length > 0 || inSuperset) {
    items.push({
      key: 'superset',
      label: 'Superset',
      items: [
        ...candidates.map((row) => ({
          key: row.id,
          label: row.name,
          onPress: () => onJoinSuperset(row.id),
        })),
        ...(inSuperset
          ? [
              {
                key: 'superset-leave',
                label: 'Remove from superset',
                destructive: true,
                separated: true,
                onPress: onLeaveSuperset,
              },
            ]
          : []),
      ],
    });
  }

  items.push({
    key: 'remove',
    label: 'Remove exercise',
    destructive: true,
    separated: true,
    onPress: onRemove,
  });

  return (
    <View style={styles.trigger}>
      <Menu open={open} items={items} onClose={() => setOpen(false)} style={styles.trigger}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exercise options"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.trigger, styles.centre, pressed && { opacity: 0.6 }]}>
          <Icon name="ellipsis" size={20} tintColor={theme.textSecondary} />
        </Pressable>
      </Menu>

      {/* Mounted only while open: `Wheel` seeds its scroll position once. */}
      {customOpen && (
        <CustomRest
          seconds={effective}
          onChange={onChangeRest}
          onClose={() => setCustomOpen(false)}
        />
      )}
    </View>
  );
}

function CustomRest({
  seconds,
  onChange,
  onClose,
}: {
  seconds: number;
  onChange: (seconds: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const minutes = Math.min(MAX_REST_MINUTES - 1, Math.floor(seconds / 60));

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: theme.scrim }]} onPress={onClose} />

      <View style={styles.centreScreen} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Rest timer
          </ThemedText>
          <View style={styles.wheels}>
            <Wheel
              unit="min"
              values={range(MAX_REST_MINUTES)}
              selection={minutes}
              onChange={(next) => onChange(next * 60 + (seconds % 60))}
            />
            <Wheel
              unit="sec"
              values={range(60)}
              selection={seconds % 60}
              onChange={(next) => onChange(minutes * 60 + next)}
            />
          </View>
          <Pressable onPress={onClose} style={styles.done}>
            <ThemedText type="smallBold" themeColor="accent">
              Done
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: SIZE,
    height: SIZE,
  },
  centre: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  centreScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  wheels: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  done: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
