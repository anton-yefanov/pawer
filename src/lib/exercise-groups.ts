export type ExerciseGroup = {
  id: string;
  title: string;
  /** Seed `primaryMuscles` values that land in this group. */
  muscles?: string[];
  /** A group backed by `exercises.category` instead. Cardio is the only one. */
  category?: string;
};

/**
 * How the library is browsed: a short, gym-legible roll-up of the sixteen
 * free-exercise-db muscles, plus Cardio.
 *
 * Deliberately a third vocabulary — `GROUP_BY_MUSCLE` in lib/muscle-groups.ts
 * (recovery and the body map) merges differently on purpose, and unifying them
 * would change what the body map shades.
 */
export const EXERCISE_GROUPS: ExerciseGroup[] = [
  { id: 'abs', title: 'Abs', muscles: ['abs'] },
  {
    id: 'back',
    title: 'Back',
    muscles: ['lats', 'traps', 'middle back', 'lower back'],
  },
  { id: 'biceps', title: 'Biceps', muscles: ['biceps'] },
  { id: 'cardio', title: 'Cardio', category: 'cardio' },
  { id: 'chest', title: 'Chest', muscles: ['chest'] },
  { id: 'forearms', title: 'Forearms', muscles: ['forearms'] },
  {
    id: 'legs',
    title: 'Legs',
    muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'],
  },
  { id: 'shoulders', title: 'Shoulders', muscles: ['shoulders'] },
  { id: 'triceps', title: 'Triceps', muscles: ['triceps'] },
];

export function exerciseGroup(id: string): ExerciseGroup | undefined {
  return EXERCISE_GROUPS.find((group) => group.id === id);
}

/**
 * The group a custom exercise is created under, in the same vocabulary the
 * library browses by. The first muscle listed is what the row stores, so the
 * group's own filter finds it again.
 */
export function groupOfExercise(exercise: {
  category: string;
  primaryMuscles: string[];
}): string | null {
  if (exercise.category === 'cardio') return 'cardio';

  const muscle = exercise.primaryMuscles[0];

  return EXERCISE_GROUPS.find((group) => group.muscles?.includes(muscle))?.id ?? null;
}
