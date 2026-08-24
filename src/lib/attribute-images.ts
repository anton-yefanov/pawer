import type { ImageSource } from 'expo-image';

/**
 * Icons for the four facts the exercise sheet shows as tiles: level, category,
 * equipment and primary muscle.
 *
 * Keys are the raw seed strings, not the filename slug. Metro needs static
 * literal paths, so this map is written out rather than assembled — a new value
 * in src/db/seed/exercises.json needs a master PNG plus a line here, and
 * scripts/attribute-vocabulary.mjs is what the build script checks against.
 */

export type AttributeKind = 'level' | 'category' | 'equipment' | 'muscle';

const LEVEL: Record<string, ImageSource> = {
  beginner: require('@/assets/attributes/level/beginner.webp'),
  intermediate: require('@/assets/attributes/level/intermediate.webp'),
  expert: require('@/assets/attributes/level/expert.webp'),
};

const CATEGORY: Record<string, ImageSource> = {
  strength: require('@/assets/attributes/category/strength.webp'),
  stretching: require('@/assets/attributes/category/stretching.webp'),
  cardio: require('@/assets/attributes/category/cardio.webp'),
  plyometrics: require('@/assets/attributes/category/plyometrics.webp'),
  powerlifting: require('@/assets/attributes/category/powerlifting.webp'),
  'olympic weightlifting': require('@/assets/attributes/category/olympic_weightlifting.webp'),
};

const EQUIPMENT: Record<string, ImageSource> = {
  bands: require('@/assets/attributes/equipment/bands.webp'),
  barbell: require('@/assets/attributes/equipment/barbell.webp'),
  'body only': require('@/assets/attributes/equipment/body_only.webp'),
  cable: require('@/assets/attributes/equipment/cable.webp'),
  dumbbell: require('@/assets/attributes/equipment/dumbbell.webp'),
  'exercise ball': require('@/assets/attributes/equipment/exercise_ball.webp'),
  kettlebells: require('@/assets/attributes/equipment/kettlebells.webp'),
  machine: require('@/assets/attributes/equipment/machine.webp'),
  'medicine ball': require('@/assets/attributes/equipment/medicine_ball.webp'),
  other: require('@/assets/attributes/equipment/other.webp'),
};

const MUSCLE: Record<string, ImageSource> = {
  abductors: require('@/assets/attributes/muscle/abductors.webp'),
  abs: require('@/assets/attributes/muscle/abs.webp'),
  adductors: require('@/assets/attributes/muscle/adductors.webp'),
  biceps: require('@/assets/attributes/muscle/biceps.webp'),
  calves: require('@/assets/attributes/muscle/calves.webp'),
  chest: require('@/assets/attributes/muscle/chest.webp'),
  forearms: require('@/assets/attributes/muscle/forearms.webp'),
  glutes: require('@/assets/attributes/muscle/glutes.webp'),
  hamstrings: require('@/assets/attributes/muscle/hamstrings.webp'),
  lats: require('@/assets/attributes/muscle/lats.webp'),
  'lower back': require('@/assets/attributes/muscle/lower_back.webp'),
  'middle back': require('@/assets/attributes/muscle/middle_back.webp'),
  quadriceps: require('@/assets/attributes/muscle/quadriceps.webp'),
  shoulders: require('@/assets/attributes/muscle/shoulders.webp'),
  traps: require('@/assets/attributes/muscle/traps.webp'),
  triceps: require('@/assets/attributes/muscle/triceps.webp'),
};

const SOURCES: Record<AttributeKind, Record<string, ImageSource>> = {
  level: LEVEL,
  category: CATEGORY,
  equipment: EQUIPMENT,
  muscle: MUSCLE,
};

/** Null when the exercise leaves the field empty or uses a value with no icon. */
export function attributeIcon(kind: AttributeKind, value: string | null): ImageSource | null {
  if (!value) return null;
  return SOURCES[kind][value.toLowerCase()] ?? null;
}
