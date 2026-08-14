import type { SetType } from '@/lib/set-types';
import type { TrackedSet } from '@/lib/tracking-types';

/**
 * What the exercise card and set row actually need. A workout's live rows and a
 * template draft's planned ones both satisfy these, which is what lets the two
 * screens share the grid — the card never learns which one it is showing.
 */

export type LoggedSet = TrackedSet & {
  id: string;
  setType: string;
  notes: string | null;
  /** Always false on a template's planned sets. */
  completed: boolean;
};

export type LoggedExercise = {
  /** The row that owns the sets: a `workout_exercises.id` or a `template_exercises.id`. */
  id: string;
  exerciseId: string;
  name: string;
  trackingType: string;
  notes: string | null;
  restSeconds: number | null;
};

export type LoggingActions = {
  addSet: (exerciseRowId: string) => void;
  removeExercise: (exerciseRowId: string) => void;
  setExerciseNotes: (exerciseRowId: string, notes: string | null) => void;
  setExerciseRest: (exerciseRowId: string, seconds: number | null) => void;
  updateSetValues: (setId: string, values: Partial<TrackedSet>) => void;
  setSetType: (setId: string, setType: SetType) => void;
  setSetNotes: (setId: string, notes: string | null) => void;
  deleteSet: (setId: string) => void;
};
