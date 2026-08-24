/**
 * The seed's muscle vocabulary is anatomical — sixteen values with a tail of
 * one or two exercises each — and nobody plans a week around it. Recovery rolls
 * it up to nine training groups in one fixed order, which is also the order the
 * board renders in: never sorted by fatigue, or the rows reshuffle between
 * opens and stop being readable as a board.
 *
 * Biceps and triceps stay apart because push/pull is the common split; a merged
 * "Arms" row would read as permanently fatigued.
 */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'calves';

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'core',
  'quads',
  'hamstrings',
  'calves',
] as const satisfies readonly MuscleGroup[];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings & glutes',
  calves: 'Calves',
};

/** What the widget's rows use — the full labels don't fit beside a bar. */
export const MUSCLE_GROUP_SHORT_LABELS: Record<MuscleGroup, string> = {
  ...MUSCLE_GROUP_LABELS,
  hamstrings: 'Hamstrings',
};

/** free-exercise-db's vocabulary, the same strings as `MUSCLE_OPTIONS`. */
const GROUP_BY_MUSCLE: Record<string, MuscleGroup> = {
  chest: 'chest',
  lats: 'back',
  'middle back': 'back',
  'lower back': 'back',
  traps: 'back',
  neck: 'back',
  shoulders: 'shoulders',
  biceps: 'biceps',
  forearms: 'biceps',
  triceps: 'triceps',
  abs: 'core',
  quadriceps: 'quads',
  hamstrings: 'hamstrings',
  glutes: 'hamstrings',
  adductors: 'hamstrings',
  abductors: 'hamstrings',
  calves: 'calves',
};

export function muscleGroupsOf(muscles: readonly string[]): MuscleGroup[] {
  const groups: MuscleGroup[] = [];
  for (const muscle of muscles) {
    const group = GROUP_BY_MUSCLE[muscle];
    if (group && !groups.includes(group)) groups.push(group);
  }
  return groups;
}
