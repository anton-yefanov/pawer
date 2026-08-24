/**
 * The attribute values that need an icon, straight out of src/db/seed/exercises.json.
 *
 * Filenames are the value slugged with underscores; src/lib/attribute-images.ts
 * keys its require-map on the raw value. A new value in the seed needs an icon
 * here, a master PNG, and a line in that map.
 */
export const ATTRIBUTE_VALUES = {
  level: ['beginner', 'intermediate', 'expert'],
  category: [
    'strength',
    'stretching',
    'cardio',
    'plyometrics',
    'powerlifting',
    'olympic weightlifting',
  ],
  equipment: [
    'bands',
    'barbell',
    'body only',
    'cable',
    'dumbbell',
    'exercise ball',
    'kettlebells',
    'machine',
    'medicine ball',
    'other',
  ],
  muscle: [
    'abductors',
    'abs',
    'adductors',
    'biceps',
    'calves',
    'chest',
    'forearms',
    'glutes',
    'hamstrings',
    'lats',
    'lower back',
    'middle back',
    'quadriceps',
    'shoulders',
    'traps',
    'triceps',
  ],
};

export const attributeSlug = (value) => value.replace(/\s+/g, '_');
