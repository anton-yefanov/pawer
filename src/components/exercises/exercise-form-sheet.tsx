import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
import {
  BackButton,
  CloseButton,
  HeaderConfirmButton,
  headerItem,
  HeaderSlot,
} from '@/components/workout/workout-sheet-header';
import { SHEET_BOTTOM_INSET } from '@/constants/sheet';
import { Spacing } from '@/constants/theme';
import type { Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { createCustomExercise, updateCustomExercise } from '@/lib/exercise-actions';
import { MUSCLE_OPTIONS, titleCase } from '@/lib/exercise-filters';
import {
  TRACKING_LABELS,
  TRACKING_SECTIONS,
  trackingTypeOf,
  type TrackingType,
} from '@/lib/tracking-types';

type Step = 'form' | 'category' | 'type';

/**
 * Creating or editing a custom exercise. Category and Exercise Type are steps
 * *inside* this sheet rather than sheets of their own: the flow is three screens
 * deep and the library is hosted by three different stacks, so routing each step
 * would mean nine registrations for what is one modal from the user's point of
 * view.
 *
 * The bar is the stack's own header, driven per step through `Stack.Screen` —
 * a hand-drawn row inside the sheet doesn't reserve layout space the way the
 * native one does, and the content ends up underneath it.
 */
export function ExerciseFormSheet({ exercise }: { exercise?: Exercise }) {
  const theme = useTheme();
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState(exercise?.name ?? '');
  const [muscle, setMuscle] = useState<string | null>(exercise?.primaryMuscles[0] ?? null);
  const [trackingType, setTrackingType] = useState<TrackingType>(
    trackingTypeOf(exercise?.trackingType),
  );
  const [description, setDescription] = useState(exercise?.description ?? '');
  // Category and tracking type are what every set already logged was recorded
  // under — re-reading 60 kg × 8 as 60 seconds is not an edit anyone means to
  // make — so both are settled at creation and read-only afterwards.
  const locked = exercise !== undefined;

  const save = async () => {
    const form = { name, muscle, trackingType, description };
    if (exercise) await updateCustomExercise(exercise.id, form);
    else await createCustomExercise(form);
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: step === 'form' && exercise ? 'Edit Exercise' : STEP_TITLES[step],
          unstable_headerLeftItems: () =>
            headerItem(
              <HeaderSlot>
                {step === 'form' ? (
                  <CloseButton onPress={() => router.back()} />
                ) : (
                  <BackButton onPress={() => setStep('form')} />
                )}
              </HeaderSlot>,
            ),
          unstable_headerRightItems: () =>
            step === 'form'
              ? headerItem(
                  <HeaderSlot>
                    <HeaderConfirmButton
                      onPress={() => void save()}
                      disabled={name.trim() === ''}
                    />
                  </HeaderSlot>,
                )
              : [],
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {step === 'form' && (
          <>
            <Card>
              <View style={groupedStyles.row}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { color: theme.text }]}
                  autoFocus={!exercise}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
              <Separator />
              <DisclosureRow
                label="Category"
                value={muscle ? titleCase(muscle) : undefined}
                chevron={!locked}
                onPress={() => {
                  if (!locked) setStep('category');
                }}
              />
            </Card>

            <SectionTitle>Exercise Type</SectionTitle>
            <Card>
              <DisclosureRow
                label={TRACKING_LABELS[trackingType].title}
                detail={TRACKING_LABELS[trackingType].examples}
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

            <SectionTitle>Description</SectionTitle>
            <Card>
              <View style={groupedStyles.row}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="How to perform this exercise"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, styles.descriptionInput, { color: theme.text }]}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </Card>
          </>
        )}

        {step === 'category' && (
          <Card>
            {MUSCLE_OPTIONS.map((option, index) => (
              <View key={option}>
                {index > 0 && <Separator />}
                <PickRow
                  label={titleCase(option)}
                  selected={option === muscle}
                  onPress={() => {
                    setMuscle(option);
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
                      detail={`Examples: ${TRACKING_LABELS[type].examples}`}
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
      </ScrollView>
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
  input: {
    flex: 1,
    fontSize: 17,
    minHeight: ROW_HEIGHT - Spacing.two * 2,
    paddingVertical: 0,
  },
  descriptionInput: {
    minHeight: 96,
  },
});
