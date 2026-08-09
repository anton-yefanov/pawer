import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Conventions, per IMPLEMENTATION_PLAN.md §1:
 *
 * - Primary keys are UUID strings, never autoincrement integers.
 * - Every row carries `createdAt` / `updatedAt` (epoch ms) and a nullable
 *   `deletedAt` for soft deletes.
 * - All weights are stored in KILOGRAMS. Conversion happens at the display
 *   layer only — nothing below this line ever sees pounds.
 *
 * None of this is used by v1, but retrofitting it once sync exists is painful
 * and it costs nothing now.
 */

const now = sql`(unixepoch() * 1000)`;

const timestamps = {
  createdAt: integer('created_at').notNull().default(now),
  updatedAt: integer('updated_at').notNull().default(now),
  deletedAt: integer('deleted_at'),
};

/** Exercise library. Seeded from free-exercise-db; user rows are `isCustom`. */
export const exercises = sqliteTable(
  'exercises',
  {
    id: text('id').primaryKey(),

    /**
     * Slug from free-exercise-db (e.g. `Ab_Crunch_Machine`). Null for custom
     * exercises. Doubles as the lookup key for bundled illustrations.
     */
    sourceId: text('source_id'),

    name: text('name').notNull(),

    /** 'push' | 'pull' | 'static' | null */
    force: text('force'),
    /** 'beginner' | 'intermediate' | 'expert' */
    level: text('level').notNull(),
    /** 'compound' | 'isolation' | null */
    mechanic: text('mechanic'),
    /** 'barbell' | 'dumbbell' | 'machine' | 'body only' | ... | null */
    equipment: text('equipment'),
    /** 'strength' | 'powerlifting' | 'cardio' | ... */
    category: text('category').notNull(),

    /**
     * Which fields a set of this exercise logs — see `src/lib/tracking-types.ts`.
     * 'weight_reps' | 'bodyweight_reps' | 'weighted_bodyweight' |
     * 'assisted_bodyweight' | 'duration' | 'distance_duration'
     */
    trackingType: text('tracking_type').notNull().default('weight_reps'),

    /** JSON string arrays — SQLite has no array type and we never join on these. */
    primaryMuscles: text('primary_muscles', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    secondaryMuscles: text('secondary_muscles', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    instructions: text('instructions', { mode: 'json' }).$type<string[]>().notNull().default([]),

    isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),

    ...timestamps,
  },
  (t) => [
    uniqueIndex('exercises_source_id_unq').on(t.sourceId),
    index('exercises_name_idx').on(t.name),
    index('exercises_equipment_idx').on(t.equipment),
  ]
);

/** One logged training session. `finishedAt` null means it is still active. */
export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    name: text('name'),
    notes: text('notes'),
    startedAt: integer('started_at').notNull(),
    finishedAt: integer('finished_at'),
    /** Template this session was started from, if any. */
    templateId: text('template_id').references(() => templates.id),
    ...timestamps,
  },
  (t) => [index('workouts_started_at_idx').on(t.startedAt)]
);

/** An exercise slotted into a workout, in user-defined order. */
export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    notes: text('notes'),
    /** Seconds. Null falls back to the global default. */
    restSeconds: integer('rest_seconds'),
    ...timestamps,
  },
  (t) => [index('workout_exercises_workout_idx').on(t.workoutId, t.position)]
);

/**
 * A single set. Which columns carry meaning depends on the exercise's
 * `trackingType`; the rest stay null. Weight is kg and distance is metres —
 * assisted exercises store the assistance as a positive magnitude.
 */
export const sets = sqliteTable(
  'sets',
  {
    id: text('id').primaryKey(),
    workoutExerciseId: text('workout_exercise_id')
      .notNull()
      .references(() => workoutExercises.id),
    position: integer('position').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
    durationSeconds: integer('duration_seconds'),
    distanceM: real('distance_m'),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
    completedAt: integer('completed_at'),
    ...timestamps,
  },
  (t) => [index('sets_workout_exercise_idx').on(t.workoutExerciseId, t.position)]
);

/** Groups personal templates. App-shipped templates are never filed. */
export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  ...timestamps,
});

/** Saved workout template. Free tier caps user-created ones at 3. */
export const templates = sqliteTable(
  'templates',
  {
    id: text('id').primaryKey(),

    /** Slug for app-shipped templates (e.g. `back_and_biceps`); null for user-created ones. */
    sourceId: text('source_id'),

    name: text('name').notNull(),
    notes: text('notes'),
    position: integer('position').notNull().default(0),
    lastUsedAt: integer('last_used_at'),
    isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
    folderId: text('folder_id').references(() => folders.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('templates_source_id_unq').on(t.sourceId),
    index('templates_folder_idx').on(t.folderId),
  ]
);

export const templateExercises = sqliteTable(
  'template_exercises',
  {
    id: text('id').primaryKey(),
    templateId: text('template_id')
      .notNull()
      .references(() => templates.id),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    position: integer('position').notNull(),
    /** How many empty sets to pre-fill when starting from this template. */
    targetSets: integer('target_sets').notNull().default(3),
    targetReps: integer('target_reps'),
    restSeconds: integer('rest_seconds'),
    ...timestamps,
  },
  (t) => [index('template_exercises_template_idx').on(t.templateId, t.position)]
);

/**
 * Personal records, denormalised so history screens never recompute across the
 * whole set table.
 *
 * Append-only: one row per achievement, never updated in place. A badge earned
 * in March has to survive being beaten in April, so the standing record is
 * `MAX(value)` per exercise and kind over rows with `deleted_at IS NULL`.
 */
export const personalRecords = sqliteTable(
  'personal_records',
  {
    id: text('id').primaryKey(),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => exercises.id),
    /** The workout the record was set in — what the history badge counts. */
    workoutId: text('workout_id')
      .notNull()
      .references(() => workouts.id),
    /** 'heaviest_weight' | 'best_1rm' | 'best_volume' | 'most_reps' */
    kind: text('kind').notNull(),
    value: real('value').notNull(),
    /** The set that set the record. */
    setId: text('set_id').references(() => sets.id),
    achievedAt: integer('achieved_at').notNull(),
    ...timestamps,
  },
  (t) => [
    index('personal_records_exercise_kind_idx').on(t.exerciseId, t.kind, t.value),
    index('personal_records_workout_idx').on(t.workoutId),
  ]
);

/** Single-row key/value store for user preferences (unit, onboarding, etc). */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  ...timestamps,
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type SetRow = typeof sets.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateExercise = typeof templateExercises.$inferSelect;
export type PersonalRecord = typeof personalRecords.$inferSelect;
