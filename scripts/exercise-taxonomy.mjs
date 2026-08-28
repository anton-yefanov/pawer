/**
 * The one place the vendor's vocabulary is turned into ours. Read by
 * build-exercise-seed.mjs, build-videos.mjs and build-images.mjs, so a browse
 * group, an on-demand video folder and a seeded `primaryMuscles` value can
 * never disagree about where an exercise belongs.
 */

export const METADATA_PATH =
  'assets/new_exercises_data/complete-exercise-library-metadata/metadata.json';
export const POSTERS_DIR = 'assets/new_exercises_data/posters';
export const VIDEOS_DIR =
  'assets/new_exercises_data/complete-exercise-library-pG9zGIVFW0qSTA5MxLnT1MtsCufuTC';

/** Vendor `primaryMuscles`, lowercased, to the group that browses it. */
export const MUSCLE_GROUPS = {
  core: 'abs',
  back: 'back',
  'lower back': 'back',
  trapezius: 'traps',
  neck: 'traps',
  biceps: 'biceps',
  triceps: 'triceps',
  chest: 'chest',
  forearms: 'forearms',
  shoulders: 'shoulders',
  glutes: 'glutes',
  quadriceps: 'legs',
  hamstrings: 'legs',
  adductors: 'legs',
  calves: 'calves',
  tibialis: 'calves',
};

/** Also the on-demand resource tags, one asset pack each. */
export const GROUP_IDS = [
  'abs',
  'back',
  'biceps',
  'calves',
  'cardio',
  'chest',
  'forearms',
  'glutes',
  'legs',
  'shoulders',
  'traps',
  'triceps',
];

export const isCardio = (entry) => entry.movementPattern.includes('Cardio');

/**
 * The single group an exercise's video ships under. An exercise with several
 * primary muscles is browsable from several groups, but its clip can only live
 * in one asset pack, so the first muscle decides.
 */
export function groupOf(entry) {
  if (isCardio(entry)) return 'cardio';
  const muscle = entry.primaryMuscles[0]?.toLowerCase();
  const group = MUSCLE_GROUPS[muscle];
  if (!group) throw new Error(`${entry.slug}: no group for muscle "${muscle}"`);
  return group;
}
