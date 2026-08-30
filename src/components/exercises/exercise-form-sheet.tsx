import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Card,
  DisclosureRow,
  groupedStyles,
  PickRow,
  ROW_HEIGHT,
  SectionFooter,
  SectionTitle,
  Separator,
} from '@/components/grouped-list';
import { ExerciseThumbnailField } from '@/components/exercises/exercise-thumbnail-field';
import { KeyboardDismissButton } from '@/components/keyboard-dismiss';
import { KeyboardScrollView } from '@/components/keyboard-scroll-view';
import { SheetHeader } from '@/components/sheet-header';
import {
  BackButton,
  CloseButton,
  HeaderConfirmButton,
} from '@/components/workout/workout-sheet-header';
import { SHEET_BOTTOM_INSET, SHEET_SCROLL } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/schema';
import { useSheetAutoFocus } from '@/hooks/use-sheet-autofocus';
import { ThemedTextInput } from '@/components/themed-text-input';
import { useTheme } from '@/hooks/use-theme';
import { createCustomExercise, updateCustomExercise } from '@/lib/exercise-actions';
import { EXERCISE_GROUPS, exerciseGroup, groupOfExercise } from '@/lib/exercise-groups';
import { deleteExercisePhoto, importExercisePhoto } from '@/lib/exercise-photos';
import { announceCustomExercise } from '@/lib/new-exercise-handoff';
import { notice } from '@/lib/notice';
import { attempt, guard, report } from '@/lib/observability';
import { pickPhoto } from '@/lib/pick-photo';
import {
  TRACKING_LABELS,
  TRACKING_SECTIONS,
  trackingTypeOf,
  type TrackingType,
} from '@/lib/tracking-types';

const SAVE_FAILED = {
  title: 'Couldn’t save exercise',
  message: 'Please try again.',
};

type Step = 'form' | 'category' | 'type';

/**
 * Creating or editing a custom exercise. Category and Exercise Type are steps
 * *inside* this sheet rather than sheets of their own: the flow is three screens
 * deep and the library is hosted by three different stacks, so routing each step
 * would mean nine registrations for what is one modal from the user's point of
 * view.
 *
 * The bar is `SheetHeader`, re-declared per step: on iOS it is the stack's own
 * header, so it must never be a row drawn over the content — that reserves no
 * layout space and the form ends up underneath it.
 */
export function ExerciseFormSheet({ exercise }: { exercise?: Exercise }) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState(exercise?.name ?? '');
  const [group, setGroup] = useState<string | null>(exercise ? groupOfExercise(exercise) : null);
  const [trackingType, setTrackingType] = useState<TrackingType>(
    trackingTypeOf(exercise?.trackingType)
  );
  // Category and tracking type are what every set already logged was recorded
  // under — re-reading 60 kg × 8 as 60 seconds is not an edit anyone means to
  // make — so both are settled at creation and read-only afterwards.
  const locked = exercise !== undefined;
  const [missingGroup, setMissingGroup] = useState(false);
  // The thumbnail is not locked: unlike category and tracking type it says
  // nothing about what a logged set meant.
  const [photo, setPhoto] = useState<string | null>(exercise?.imageFile ?? null);
  const [importing, setImporting] = useState(false);
  // Every file this sheet imported, and whether one of them was committed. The
  // sheet is swipe-dismissible, so unmount is the only place that catches every
  // way out of it.
  const imported = useRef<string[]>([]);
  const saved = useRef<string | null>(null);
  const [nameRef, nameAutoFocus] = useSheetAutoFocus(!exercise);

  useEffect(
    () => () => {
      for (const file of imported.current) {
        if (file !== saved.current) deleteExercisePhoto(file);
      }
    },
    []
  );

  const pick = async () => {
    const uri = await guard('photos', pickPhoto(), undefined, { phase: 'pick' });
    if (!uri) return;

    setImporting(true);
    try {
      const file = await importExercisePhoto(uri);
      imported.current.push(file);
      setPhoto(file);
    } catch (error) {
      report('photos', error, { phase: 'import-exercise' });
      notice({ title: 'Couldn’t use that photo', message: 'Please pick a different one.' });
    } finally {
      setImporting(false);
    }
  };

  const save = async () => {
    if (!group) {
      setMissingGroup(true);
      return;
    }
    saved.current = photo;
    const form = { name, group, trackingType, imageFile: photo };
    const written = exercise
      ? await attempt('exercises', updateCustomExercise(exercise.id, form), SAVE_FAILED)
      : await guard('exercises', createCustomExercise(form), SAVE_FAILED).then((id) => {
          if (id === undefined) return false;
          announceCustomExercise(id);
          return true;
        });
    // The sheet used to just sit there on a failed write, with the photo already
    // claimed by `saved.current` and so spared by the unmount cleanup.
    if (!written) {
      saved.current = null;
      return;
    }
    router.back();
  };

  return (
    <>
      <SheetHeader
        title={step === 'form' && exercise ? 'Edit Exercise' : STEP_TITLES[step]}
        left={
          step === 'form' ? (
            <CloseButton onPress={() => router.back()} />
          ) : (
            <BackButton onPress={() => setStep('form')} />
          )
        }
        right={
          step === 'form' ? (
            <HeaderConfirmButton onPress={() => void save()} disabled={name.trim() === ''} />
          ) : null
        }
      />

      <KeyboardScrollView
        {...SHEET_SCROLL}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {step === 'form' && (
          <>
            <View style={styles.thumbnail}>
              <ExerciseThumbnailField
                file={photo}
                busy={importing}
                onPick={() => void pick()}
                onRemove={() => setPhoto(null)}
              />
            </View>

            <Card>
              <View style={groupedStyles.row}>
                <ThemedTextInput
                  ref={nameRef}
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  style={styles.input}
                  autoFocus={nameAutoFocus}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
              <Separator />
              <DisclosureRow
                label="Category"
                value={group ? exerciseGroup(group)?.title : undefined}
                chevron={!locked}
                onPress={() => {
                  if (!locked) setStep('category');
                }}
              />
            </Card>
            {missingGroup && (
              <SectionFooter themeColor="danger">
                Pick a category for this exercise before saving.
              </SectionFooter>
            )}

            <SectionTitle>Exercise Type</SectionTitle>
            <Card>
              <DisclosureRow
                label={TRACKING_LABELS[trackingType].title}
                chevron={!locked}
                onPress={() => {
                  if (!locked) setStep('type');
                }}
              />
            </Card>
            {locked && (
              <SectionFooter>
                Category and Exercise Type are set when an exercise is created and can&apos;t be
                changed afterwards.
              </SectionFooter>
            )}
          </>
        )}

        {step === 'category' && (
          <Card>
            {EXERCISE_GROUPS.map((option, index) => (
              <View key={option.id}>
                {index > 0 && <Separator />}
                <PickRow
                  label={option.title}
                  selected={option.id === group}
                  onPress={() => {
                    setGroup(option.id);
                    setMissingGroup(false);
                    setStep('form');
                  }}
                />
              </View>
            ))}
          </Card>
        )}

        {step === 'type' &&
          TRACKING_SECTIONS.map((section) => (
            <View key={section.title}>
              <SectionTitle>{section.title}</SectionTitle>
              <Card>
                {section.types.map((type, index) => (
                  <View key={type}>
                    {index > 0 && <Separator />}
                    <PickRow
                      label={TRACKING_LABELS[type].title}
                      selected={type === trackingType}
                      onPress={() => {
                        setTrackingType(type);
                        setStep('form');
                      }}
                    />
                  </View>
                ))}
              </Card>
            </View>
          ))}
      </KeyboardScrollView>

      <KeyboardDismissButton />
    </>
  );
}

const STEP_TITLES: Record<Step, string> = {
  form: 'Add Exercise',
  category: 'Select Category',
  type: 'Exercise Type',
};

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.three,
    paddingBottom: SHEET_BOTTOM_INSET + Spacing.four,
  },
  thumbnail: {
    marginBottom: Spacing.three,
  },
  input: {
    flex: 1,
    minHeight: ROW_HEIGHT - Spacing.two * 2,
    paddingVertical: 0,
  },
});
