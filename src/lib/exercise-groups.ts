export type ExerciseGroup = {
  id: string;
  title: string;
  /** Seed `primaryMuscles` values that land in this group. */
  muscles?: string[];
  /** A group backed by `exercises.category` instead. Cardio is the only one. */
  category?: string;
};

/**
 * How the library is browsed: a gym-legible roll-up of the sixteen muscles the
 * exercise metadata names, plus Cardio.
 *
 * Glutes and quads are the two biggest muscles in this library, so a single
 * Legs row would hold well over a third of it. Glutes, calves and traps get
 * their own rows to keep every group scannable.
 */
export const EXERCISE_GROUPS: ExerciseGroup[] = [
  { id: 'abs', title: 'Abs', muscles: ['core'] },
  { id: 'back', title: 'Back', muscles: ['back', 'lower back'] },
  { id: 'biceps', title: 'Biceps', muscles: ['biceps'] },
  { id: 'calves', title: 'Calves', muscles: ['calves', 'tibialis'] },
  { id: 'cardio', title: 'Cardio', category: 'cardio' },
  { id: 'chest', title: 'Chest', muscles: ['chest'] },
  { id: 'forearms', title: 'Forearms', muscles: ['forearms'] },
  { id: 'glutes', title: 'Glutes', muscles: ['glutes'] },
  { id: 'legs', title: 'Legs', muscles: ['quadriceps', 'hamstrings', 'adductors'] },
  { id: 'shoulders', title: 'Shoulders', muscles: ['shoulders'] },
  { id: 'traps', title: 'Traps', muscles: ['trapezius', 'neck'] },
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
