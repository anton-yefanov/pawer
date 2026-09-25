import { t } from '@/i18n';
import type catalog from '@/i18n/locales/en/exercises.json';

type GroupId = keyof typeof catalog.group;

export type ExerciseGroup = {
  id: string;
  readonly title: string;
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
const GROUPS: (Omit<ExerciseGroup, 'id' | 'title'> & { id: GroupId })[] = [
  { id: 'abs', muscles: ['core'] },
  { id: 'back', muscles: ['back', 'lower back'] },
  { id: 'biceps', muscles: ['biceps'] },
  { id: 'calves', muscles: ['calves', 'tibialis'] },
  { id: 'cardio', category: 'cardio' },
  { id: 'chest', muscles: ['chest'] },
  { id: 'forearms', muscles: ['forearms'] },
  { id: 'glutes', muscles: ['glutes'] },
  { id: 'legs', muscles: ['quadriceps', 'hamstrings', 'adductors'] },
  { id: 'shoulders', muscles: ['shoulders'] },
  { id: 'traps', muscles: ['trapezius', 'neck'] },
  { id: 'triceps', muscles: ['triceps'] },
];

export const EXERCISE_GROUPS: ExerciseGroup[] = GROUPS.map((group) => ({
  ...group,
  get title() {
    return t(`exercises:group.${group.id}`);
  },
}));

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
