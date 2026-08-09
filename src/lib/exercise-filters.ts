import { and, isNull, like, sql, type SQL } from 'drizzle-orm';

import { exercises } from '@/db/schema';
import seedExercises from '@/db/seed/exercises.json';

/** Sentinel used by the native pickers for "no filter on this facet". */
export const ANY = '__any__';

/**
 * Facet vocabularies, derived from the bundled library so they can never drift
 * from what is actually seeded. The seed JSON is already in the bundle (see
 * db/seed.ts), so this costs nothing extra.
 *
 * Custom exercises are not represented yet — when they arrive these become
 * queries over the exercises table instead.
 */
export const MUSCLE_OPTIONS: string[] = [
  ...new Set(seedExercises.flatMap((e) => e.primaryMuscles)),
].sort();

export const EQUIPMENT_OPTIONS: string[] = [
  ...new Set(seedExercises.map((e) => e.equipment).filter((e): e is string => Boolean(e))),
].sort();

export type FacetMenu = {
  /** Rows at the menu's top level. */
  options: string[];
  /** Submenus, one level down. */
  groups?: { title: string; options: string[] }[];
};

/**
 * A UIMenu taller than the space below its anchor turns into a scroll view, and
 * a scrolling menu spends the press-and-drag gesture on panning instead of
 * selecting a row. Sixteen muscles plus "Any" crosses that threshold, so the
 * long tail lives in submenus — don't flatten this back out.
 */
const MUSCLE_GROUPS: Record<string, string[]> = {
  Arms: ['biceps', 'triceps', 'forearms'],
  Back: ['lats', 'traps', 'middle back', 'lower back'],
  Legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'],
};

const GROUPED_MUSCLES = new Set(Object.values(MUSCLE_GROUPS).flat());

export const MUSCLE_MENU: FacetMenu = {
  options: MUSCLE_OPTIONS.filter((muscle) => !GROUPED_MUSCLES.has(muscle)),
  groups: Object.entries(MUSCLE_GROUPS).map(([title, options]) => ({
    title,
    options: options.filter((muscle) => MUSCLE_OPTIONS.includes(muscle)),
  })),
};

export const EQUIPMENT_MENU: FacetMenu = { options: EQUIPMENT_OPTIONS };

export type ExerciseFilters = {
  search: string;
  muscle: string;
  equipment: string;
};

export const NO_FILTERS: ExerciseFilters = { search: '', muscle: ANY, equipment: ANY };

export function activeFilterCount(filters: ExerciseFilters): number {
  return (filters.muscle !== ANY ? 1 : 0) + (filters.equipment !== ANY ? 1 : 0);
}

/**
 * Builds the WHERE clause for the library list.
 *
 * Muscle matching goes through `json_each` because `primary_muscles` is a JSON
 * array in a text column — a plain LIKE would match "lower back" inside
 * "middle back" style substrings and silently over-match.
 */
export function exerciseFilterWhere(filters: ExerciseFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = [isNull(exercises.deletedAt)];

  const search = filters.search.trim();
  if (search !== '') {
    // SQLite's LIKE is case-insensitive for ASCII, which is all we need here.
    clauses.push(like(exercises.name, `%${search}%`));
  }

  if (filters.equipment !== ANY) {
    clauses.push(sql`${exercises.equipment} = ${filters.equipment}`);
  }

  if (filters.muscle !== ANY) {
    clauses.push(
      sql`EXISTS (SELECT 1 FROM json_each(${exercises.primaryMuscles}) WHERE value = ${filters.muscle})`
    );
  }

  return and(...clauses);
}

/** "body only" → "Body Only" */
export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
