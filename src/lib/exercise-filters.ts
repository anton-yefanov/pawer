import { and, asc, isNull, ne, sql, type SQL } from 'drizzle-orm';

import { exercises } from '@/db/schema';
import seedExercises from '@/db/seed/exercises.json';
import { exerciseGroup } from '@/lib/exercise-groups';
import { collapse, searchTokens } from '@/lib/exercise-search';

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

export const EQUIPMENT_MENU: FacetMenu = { options: EQUIPMENT_OPTIONS };

export type ExerciseFilters = {
  search: string;
  /** An `EXERCISE_GROUPS` id. Navigation rather than a filter facet. */
  group: string;
  equipment: string;
};

export const NO_FILTERS: ExerciseFilters = { search: '', group: ANY, equipment: ANY };

export function activeFilterCount(filters: ExerciseFilters): number {
  return filters.equipment !== ANY ? 1 : 0;
}

/** Resting state: nothing picked, nothing typed, so the library shows groups. */
export function isBrowsing(filters: ExerciseFilters): boolean {
  return filters.search.trim() === '' && filters.group === ANY && filters.equipment === ANY;
}

/**
 * What a search matches against: the derived blob, falling back to the name for
 * custom rows written before `search_text` existed.
 */
const HAYSTACK = sql`CASE WHEN ${exercises.searchText} = ''
  THEN lower(${exercises.name}) ELSE ${exercises.searchText} END`;

/**
 * Builds the WHERE clause for the library list.
 *
 * Every query token has to appear somewhere in the haystack, which makes word
 * order irrelevant; the haystack carries each string both spaced and collapsed,
 * so "pull down" and "pulldown" find each other (see lib/exercise-search.ts).
 *
 * Group matching goes through `json_each` because `primary_muscles` is a JSON
 * array in a text column — a plain LIKE would match "lower back" inside
 * "middle back" style substrings and silently over-match. A muscle group also
 * has to exclude cardio: every cardio exercise is tagged `quadriceps` upstream,
 * so without that it shows up under Legs as well as under its own group.
 */
export function exerciseFilterWhere(filters: ExerciseFilters): SQL | undefined {
  const clauses: (SQL | undefined)[] = [isNull(exercises.deletedAt)];

  for (const token of searchTokens(filters.search)) {
    // SQLite's LIKE is case-insensitive for ASCII, which is all we need here.
    clauses.push(sql`${HAYSTACK} LIKE ${`%${token}%`}`);
  }

  if (filters.equipment !== ANY) {
    clauses.push(sql`${exercises.equipment} = ${filters.equipment}`);
  }

  const group = filters.group === ANY ? undefined : exerciseGroup(filters.group);

  if (group?.category) {
    clauses.push(sql`${exercises.category} = ${group.category}`);
  } else if (group?.muscles) {
    clauses.push(
      sql`EXISTS (SELECT 1 FROM json_each(${exercises.primaryMuscles})
        WHERE value IN (${sql.join(
          group.muscles.map((muscle) => sql`${muscle}`),
          sql`, `
        )}))`,
      ne(exercises.category, 'cardio')
    );
  }

  return and(...clauses);
}

/**
 * Orders search results by how directly they answer the query: the name starts
 * with it, then the name (or a tag) contains it whole, then everything the
 * per-token match let through. Alphabetical inside each band, and alphabetical
 * throughout when nothing is typed.
 *
 * The first band leans on `buildSearchText` putting the collapsed name first in
 * the blob, which is what makes a leading `LIKE` a name-prefix test.
 */
export function exerciseSearchOrderBy(filters: ExerciseFilters): SQL[] {
  const query = collapse(filters.search);
  if (query === '') return [asc(exercises.name)];

  return [
    sql`CASE
      WHEN ${HAYSTACK} LIKE ${`${query}%`} THEN 0
      WHEN ${HAYSTACK} LIKE ${`%${query}%`} THEN 1
      ELSE 2 END`,
    asc(exercises.name),
  ];
}

/** "body only" → "Body Only" */
export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}
