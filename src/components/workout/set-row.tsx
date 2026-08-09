import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useDebouncedWrite } from '@/hooks/use-debounced-write';
import { useTheme } from '@/hooks/use-theme';
import {
  formatPreviousSet,
  TRACKING,
  type SetField,
  type TrackedSet,
  type TrackingType,
} from '@/lib/tracking-types';
import {
  displayToKg,
  displayToMeters,
  distanceUnitFor,
  formatDuration,
  kgToDisplay,
  metersToDisplay,
  parseDecimalInput,
  parseDurationInput,
  roundForDisplay,
  type WeightUnit,
} from '@/lib/units';
import { deleteSet, updateSetValues } from '@/lib/workout-actions';
import type { PreviousSet, WorkoutSetRow } from '@/lib/workout-queries';

export const SET_COLUMNS = { set: 40, check: 44 } as const;

/** A lone field spans the space two would share — see the Strong screenshots. */
export function fieldWidth(field: SetField, fieldCount: number): number {
  if (fieldCount === 1) return 152;
  return field === 'weight' || field === 'reps' ? 64 : 76;
}

type Props = {
  set: WorkoutSetRow;
  index: number;
  previous: PreviousSet | undefined;
  unit: WeightUnit;
  trackingType: TrackingType;
  onComplete: (set: WorkoutSetRow, completed: boolean) => void;
};

export function SetRow({ set, index, previous, unit, trackingType, onComplete }: Props) {
  const theme = useTheme();
  const { fields } = TRACKING[trackingType];

  const previousLabel = previous ? formatPreviousSet(previous, trackingType, unit) : '—';

  const row = (
    <View
      style={[
        styles.row,
        { backgroundColor: set.completed ? theme.successMuted : theme.surface },
      ]}>
      <View style={[styles.setNumber, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small">{index + 1}</ThemedText>
      </View>

      <ThemedText
        type="small"
        themeColor="textSecondary"
        numberOfLines={1}
        style={styles.previous}>
        {previousLabel}
      </ThemedText>

      {fields.map((field) => {
        const cell = FIELDS[field];
        return (
          <NumericCell
            key={field}
            width={fieldWidth(field, fields.length)}
            value={cell.display(set, unit)}
            placeholder={previous ? cell.display(previous, unit) : ''}
            keyboardType={cell.keyboardType}
            maxLength={cell.maxLength}
            onCommit={(text) => updateSetValues(set.id, cell.parse(text, unit))}
          />
        );
      })}

      <Pressable
        onPress={() => onComplete(set, !set.completed)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: set.completed }}
        style={({ pressed }) => [
          styles.check,
          { backgroundColor: set.completed ? theme.success : theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        <SymbolView
          name="checkmark"
          size={16}
          tintColor={set.completed ? theme.accentContent : theme.text}
        />
      </Pressable>
    </View>
  );

  // RNGH's web implementation isn't worth the weight here; other platforms get
  // the swipe target as a plain trailing button instead.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return row;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      onSwipeableOpen={(direction) => direction === 'right' && deleteSet(set.id)}
      renderRightActions={() => (
        <View style={[styles.delete, { backgroundColor: theme.danger }]}>
          <SymbolView name="trash" size={18} tintColor={theme.accentContent} />
        </View>
      )}>
      {row}
    </ReanimatedSwipeable>
  );
}

type FieldCell = {
  display: (set: TrackedSet, unit: WeightUnit) => string;
  parse: (text: string, unit: WeightUnit) => Parameters<typeof updateSetValues>[1];
  keyboardType: React.ComponentProps<typeof TextInput>['keyboardType'];
  maxLength: number;
};

const FIELDS: Record<SetField, FieldCell> = {
  weight: {
    display: (set, unit) =>
      set.weightKg == null ? '' : String(roundForDisplay(kgToDisplay(set.weightKg, unit), unit)),
    parse: (text, unit) => {
      const parsed = parseDecimalInput(text);
      return { weightKg: parsed == null ? null : displayToKg(parsed, unit) };
    },
    keyboardType: 'decimal-pad',
    maxLength: 6,
  },
  reps: {
    display: (set) => (set.reps == null ? '' : String(set.reps)),
    parse: (text) => {
      const digits = text.replace(/\D/g, '');
      return { reps: digits === '' ? null : Number(digits) };
    },
    keyboardType: 'number-pad',
    maxLength: 3,
  },
  duration: {
    display: (set) => (set.durationSeconds == null ? '' : formatDuration(set.durationSeconds)),
    parse: (text) => ({ durationSeconds: parseDurationInput(text) }),
    keyboardType: 'number-pad',
    maxLength: 8,
  },
  distance: {
    display: (set, unit) => {
      if (set.distanceM == null) return '';
      const value = metersToDisplay(set.distanceM, distanceUnitFor(unit));
      return String(Math.round(value * 100) / 100);
    },
    parse: (text, unit) => {
      const parsed = parseDecimalInput(text);
      return {
        distanceM: parsed == null ? null : displayToMeters(parsed, distanceUnitFor(unit)),
      };
    },
    keyboardType: 'decimal-pad',
    maxLength: 7,
  },
};

/**
 * "The default iOS number drawer" is just the keyboard type — no native module
 * involved. Decimals go through `parseDecimalInput` rather than `Number`
 * because the decimal pad's separator key renders as a comma in many locales.
 *
 * The focus guard is the same one the details card uses: while the field is
 * focused it owns its text, or a live-query re-render rewrites "10." to "10".
 */
function NumericCell({
  value,
  placeholder,
  width,
  onCommit,
  ...rest
}: {
  value: string;
  placeholder: string;
  width: number;
  onCommit: (text: string) => void;
} & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  const [text, setText] = useState(value);
  const focused = useRef(false);
  const write = useDebouncedWrite(onCommit);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  return (
    <TextInput
      value={text}
      onChangeText={(next) => {
        setText(next);
        write.push(next);
      }}
      onFocus={() => {
        focused.current = true;
      }}
      onEndEditing={() => {
        focused.current = false;
        write.flush();
      }}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      selectTextOnFocus
      textAlign="center"
      style={[styles.input, { width, backgroundColor: theme.backgroundElement, color: theme.text }]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    minHeight: 44,
  },
  setNumber: {
    width: SET_COLUMNS.set,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previous: {
    flex: 1,
    textAlign: 'center',
  },
  input: {
    height: 32,
    borderRadius: 8,
    fontSize: 16,
    padding: 0,
  },
  check: {
    width: SET_COLUMNS.check - 8,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delete: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
