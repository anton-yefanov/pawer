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
  supersetId: string | null;
};

/**
 * Every action is a write. They resolve rather than returning void so a caller
 * that debounces one — `useDebouncedWrite` — can tell whether the value the user
 * typed actually landed; dropping the promise is how a half-typed weight goes
 * missing with nothing said and nothing reported.
 */
type Write = Promise<unknown> | void;

export type LoggingActions = {
  addSet: (exerciseRowId: string) => Write;
  removeExercise: (exerciseRowId: string) => Write;
  setExerciseNotes: (exerciseRowId: string, notes: string | null) => Write;
  setExerciseRest: (exerciseRowId: string, seconds: number | null) => Write;
  joinSuperset: (exerciseRowId: string, targetRowId: string) => Write;
  leaveSuperset: (exerciseRowId: string) => Write;
  updateSetValues: (setId: string, values: Partial<TrackedSet>) => Write;
  setSetType: (setId: string, setType: SetType) => Write;
  setSetNotes: (setId: string, notes: string | null) => Write;
  deleteSet: (setId: string) => Write;
};
