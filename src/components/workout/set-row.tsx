import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Pressable as GesturePressable } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { DurationCell } from '@/components/workout/duration-cell';
import { NoteInput } from '@/components/workout/note-input';
import { SET_TYPE_CELL, SetTypeMenu } from '@/components/workout/set-type-menu';
import { Spacing } from '@/constants/theme';
import { useDebouncedWrite } from '@/hooks/use-debounced-write';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import { useAutofillWeight } from '@/lib/autofill-weight';
import * as haptics from '@/lib/haptics';
import type { LoggedSet, LoggingActions } from '@/lib/logging-model';
import { setTypeOf } from '@/lib/set-types';
import {
  formatPreviousSet,
  missingRequiredFields,
  TRACKING,
  type SetField,
  type TrackedSet,
  type TrackingType,
} from '@/lib/tracking-types';
import {
  displayToKg,
  displayToMeters,
  distanceUnitFor,
  kgToDisplay,
  metersToDisplay,
  parseDecimalInput,
  roundForDisplay,
  type WeightUnit,
} from '@/lib/units';
import type { PreviousSet } from '@/lib/workout-queries';

export const SET_COLUMNS = { set: SET_TYPE_CELL.width, check: 44 } as const;

/**
 * The inputs share one block of fixed total width whatever the tracking type,
 * so Previous and the input columns land in the same place on every card.
 */
const FIELDS_WIDTH = 152;

export function fieldWidth(fieldCount: number): number {
  return (FIELDS_WIDTH - Spacing.two * (fieldCount - 1)) / fieldCount;
}

type Props = {
  set: LoggedSet;
  label: string;
  previous: PreviousSet | undefined;
  unit: WeightUnit;
  trackingType: TrackingType;
  actions: LoggingActions;
  /** Omitted in the template editor: a planned set has nothing to tick. */
  onComplete?: (set: LoggedSet, completed: boolean) => void;
};

export function SetRow({ set, label, previous, unit, trackingType, actions, onComplete }: Props) {
  const theme = useTheme();
  const { fields } = TRACKING[trackingType];
  const autofillWeight = useAutofillWeight();

  // Cells write through a 400 ms debounce, so `set` lags the keystroke that
  // just made the set completable; the draft carries it until the write lands.
  const [draft, setDraft] = useState<Partial<TrackedSet>>({});
  const [flagged, setFlagged] = useState(false);
  const flagTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [noteOpen, setNoteOpen] = useState(() => (set.notes ?? '') !== '');
  /**
   * A swipe action's button and glyph cost more to mount than the row they sit
   * behind, and a session mounts one pair per set — enough to hold the logger's
   * first commit, and the sheet it opens in, for a second. The coloured strip
   * still mounts with the row so the Swipeable measures a stable width; only its
   * contents wait for a drag to begin.
   */
  const [swiped, setSwiped] = useState(false);
  // Blurring the input on removal fires onEndEditing with the text still in it,
  // which would write the note straight back.
  const removingNote = useRef(false);

  const hasNote = noteOpen || (set.notes ?? '') !== '';

  const toggleNote = () => {
    if (hasNote) {
      removingNote.current = true;
      setNoteOpen(false);
      actions.setSetNotes(set.id, null);
      return;
    }
    removingNote.current = false;
    setNoteOpen(true);
  };

  useEffect(() => () => clearTimeout(flagTimer.current ?? undefined), []);

  const completable = onComplete != null;
  const missing =
    !completable || set.completed ? [] : missingRequiredFields({ ...set, ...draft }, trackingType);

  const previousLabel = previous ? formatPreviousSet(previous, trackingType, unit) : '—';

  const row = (
    <View
      style={[styles.row, { backgroundColor: set.completed ? theme.successMuted : theme.surface }]}>
      <SetTypeMenu
        label={label}
        setType={setTypeOf(set.setType)}
        completed={set.completed}
        onChange={(setType) => actions.setSetType(set.id, setType)}
      />

      <ThemedText type="footnote" themeColor="textTertiary" numberOfLines={1} style={styles.previous}>
        {previousLabel}
      </ThemedText>

      {fields.map((field) => {
        if (field === 'duration') {
          return (
            <DurationCell
              key={field}
              width={fieldWidth(fields.length)}
              seconds={set.durationSeconds}
              placeholder={previous?.durationSeconds ?? null}
              highlighted={flagged && missing.includes(field)}
              completed={set.completed}
              onEdit={(value) => setDraft((current) => ({ ...current, durationSeconds: value }))}
              onCommit={(value) => actions.updateSetValues(set.id, { durationSeconds: value })}
            />
          );
        }

        const cell = FIELDS[field];
        return (
          <NumericCell
            key={field}
            width={fieldWidth(fields.length)}
            value={cell.display(set, unit)}
            placeholder={previous ? cell.display(previous, unit) : ''}
            keyboardType={cell.keyboardType}
            maxLength={cell.maxLength}
            highlighted={flagged && missing.includes(field)}
            completed={set.completed}
            onEdit={(text) => setDraft((current) => ({ ...current, ...cell.parse(text, unit) }))}
            onCommit={(text) => {
              const values = cell.parse(text, unit);
              const fillWeight =
                autofillWeight &&
                field === 'reps' &&
                values.reps != null &&
                set.weightKg == null &&
                fields.includes('weight') &&
                previous?.weightKg != null;
              // Returned, not dropped: `useDebouncedWrite` guards whatever the
              // commit hands back, and this is the write that carries the
              // weight and reps the user just typed.
              return actions.updateSetValues(
                set.id,
                fillWeight ? { ...values, weightKg: previous.weightKg } : values,
              );
            }}
          />
        );
      })}

      {onComplete && (
        <Pressable
          onPress={() => {
            if (missing.length > 0) {
              haptics.reject();
              setFlagged(true);
              clearTimeout(flagTimer.current ?? undefined);
              flagTimer.current = setTimeout(() => setFlagged(false), FLAG_MS);
              return;
            }
            // Unticking is a correction, not an achievement.
            if (set.completed) haptics.select();
            else haptics.complete();
            onComplete(set, !set.completed);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{
            checked: set.completed,
            disabled: missing.length > 0,
          }}
          accessibilityHint={
            missing.length > 0
              ? `Enter ${missing.map((field) => FIELD_NAMES[field]).join(' or ')} to complete this set`
              : undefined
          }
          style={({ pressed }) => [
            styles.check,
            {
              backgroundColor: set.completed ? theme.success : theme.backgroundElement,
            },
            pressed && styles.pressed,
          ]}>
          <Icon
            name="checkmark"
            size={16}
            tintColor={
              set.completed
                ? theme.accentContent
                : missing.length > 0
                  ? theme.textSecondary
                  : theme.text
            }
          />
        </Pressable>
      )}
    </View>
  );

  const note = noteOpen && (
    <NoteInput
      value={set.notes ?? ''}
      onCommit={(next) => {
        if (removingNote.current) return;
        return actions.setSetNotes(set.id, next.trim() || null);
      }}
      placeholder="Note"
      minHeight={28}
      autoFocus={(set.notes ?? '') === ''}
      style={[styles.note, { backgroundColor: set.completed ? theme.successMuted : theme.surface }]}
    />
  );

  // RNGH's web implementation isn't worth the weight here; other platforms get
  // the swipe target as a plain trailing button instead.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return (
      <>
        {row}
        {note}
      </>
    );
  }

  return (
    <>
      <ReanimatedSwipeable
        friction={2}
        leftThreshold={40}
        rightThreshold={40}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpenStartDrag={() => setSwiped(true)}
        renderLeftActions={(_progress, _translation, swipeable) => (
          <View style={[styles.action, { backgroundColor: theme.accent }]}>
            {swiped && (
              // A swipe action has to be gesture-handler's Pressable: on Android
              // the RN one never sees the touch inside a Swipeable.
              <GesturePressable
                onPress={() => {
                  haptics.tap();
                  swipeable.close();
                  toggleNote();
                }}
                accessibilityRole="button"
                accessibilityLabel={hasNote ? 'Remove note' : 'Add note'}
                style={({ pressed }) => [styles.actionFill, pressed && styles.pressed]}>
                <Icon
                  name={hasNote ? 'text.badge.minus' : 'note.text'}
                  size={18}
                  tintColor={theme.accentContent}
                />
              </GesturePressable>
            )}
          </View>
        )}
        renderRightActions={(_progress, _translation, swipeable) => (
          <View style={[styles.action, { backgroundColor: theme.danger }]}>
            {swiped && (
              <GesturePressable
                // Deleting a set has no confirmation step, so the buzz is the
                // only acknowledgement the swipe gets.
                onPress={() => {
                  haptics.warn();
                  swipeable.close();
                  actions.deleteSet(set.id);
                }}
                accessibilityRole="button"
                accessibilityLabel="Delete set"
                style={({ pressed }) => [styles.actionFill, pressed && styles.pressed]}>
                <Icon name="trash" size={18} tintColor={theme.accentContent} />
              </GesturePressable>
            )}
          </View>
        )}>
        {row}
      </ReanimatedSwipeable>
      {note}
    </>
  );
}

const FLAG_MS = 1500;

const FIELD_NAMES: Record<SetField, string> = {
  weight: 'weight',
  reps: 'reps',
  duration: 'time',
  distance: 'distance',
};

type FieldCell = {
  display: (set: TrackedSet, unit: WeightUnit) => string;
  parse: (text: string, unit: WeightUnit) => Partial<TrackedSet>;
  keyboardType: React.ComponentProps<typeof TextInput>['keyboardType'];
  maxLength: number;
};

/** Time is picked, not typed — `DurationCell` handles that field instead. */
const FIELDS: Record<Exclude<SetField, 'duration'>, FieldCell> = {
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
  highlighted,
  completed,
  onEdit,
  onCommit,
  ...rest
}: {
  value: string;
  placeholder: string;
  width: number;
  highlighted: boolean;
  completed: boolean;
  onEdit: (text: string) => void;
  onCommit: (text: string) => void;
} & React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  const focused = useRef(false);
  const input = useRef<TextInput>(null);
  const write = useDebouncedWrite(onCommit);

  useEffect(() => {
    if (!focused.current) setText(value);
  }, [value]);

  const field = (
    <ThemedTextInput
      ref={input}
      value={text}
      onChangeText={(next) => {
        setText(next);
        onEdit(next);
        write.push(next);
      }}
      onFocus={() => {
        focused.current = true;
        setEditing(true);
      }}
      onEndEditing={() => {
        focused.current = false;
        setEditing(false);
        write.flush();
      }}
      // Android's EditText draws the caret at the end of the *hint* when the
      // field is empty and centred, which parks it against the right edge of
      // the cell. Dropping the hint while focused is what centres it.
      placeholder={Platform.OS === 'android' && editing ? '' : placeholder}
      selectTextOnFocus
      textAlign="center"
      style={[
        styles.input,
        {
          width,
          backgroundColor: highlighted
            ? theme.dangerHighlight
            : completed
              ? theme.successElement
              : theme.backgroundElement,
        },
      ]}
      {...rest}
    />
  );

  if (Platform.OS !== 'android') return field;

  // Android delivers the touch straight to the native EditText, which asks its
  // parents not to intercept and then keeps the whole gesture, so a drag that
  // starts on a cell scrolls nothing. `box-only` on the wrapper is what keeps
  // the touch off the input: React Native's pointer events only reach Android's
  // dispatch through a view group, never through the input itself, so setting
  // them on the input is inert. The tap that focuses the cell comes from the
  // wrapper instead, and nothing is lost — focus selects the whole value
  // anyway, so there is no cursor to place by tapping inside it.
  return (
    <Pressable
      pointerEvents="box-only"
      collapsable={false}
      onPress={() => input.current?.focus()}>
      {field}
    </Pressable>
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
  previous: {
    flex: 1,
    textAlign: 'center',
  },
  // Fixed-width figures: the weight and reps columns line up down the card, and
  // a digit typed into one must not shift the ones already there.
  input: {
    height: 32,
    borderRadius: 8,
    padding: 0,
    fontVariant: ['tabular-nums'],
  },
  check: {
    width: SET_COLUMNS.check - 8,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {
    width: 72,
  },
  actionFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
});
