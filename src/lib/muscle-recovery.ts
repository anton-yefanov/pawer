import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';

import type { ThemeColor } from '@/constants/theme';
import { db } from '@/db/client';
import { exercises, sets, workoutExercises, workouts } from '@/db/schema';
import {
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUP_SHORT_LABELS,
  MUSCLE_GROUPS,
  muscleGroupsOf,
  type MuscleGroup,
} from '@/lib/muscle-groups';
import { WORK_SETS } from '@/lib/workout-queries';

/**
 * Readiness is a fraction: 0 is just trained, 1 is fully recovered.
 *
 *     readiness = clamp01((now - lastHitAt) / window)
 *
 * A primary muscle hit uses the group's full window, a secondary one half of
 * it, so incidental work recovers sooner. Never trained is 1 — the board is
 * never empty and never collapses.
 *
 * Volume is deliberately not an input: a bar that moves for reasons the user
 * cannot see is worse than a coarse bar they can predict.
 */

type Theme = Record<ThemeColor, string>;

const HOUR_MS = 3_600_000;

/** The only place the windows live. Large groups recover slower than small ones. */
export const RECOVERY_WINDOW_HOURS: Record<MuscleGroup, number> = {
  chest: 72,
  back: 72,
  shoulders: 48,
  biceps: 48,
  triceps: 48,
  core: 24,
  quads: 72,
  hamstrings: 72,
  calves: 48,
};

const SECONDARY_FACTOR = 0.5;

/** What "sets logged recently" means in the sheet. */
export const RECENT_DAYS = 7;

const RECENT_SECONDS = RECENT_DAYS * 24 * 60 * 60;

/**
 * One row per exercise the user has ever completed a work set of: when it was
 * last trained, which session did it, and how many sets it took in the last
 * week. Grouping by exercise rather than by set keeps this bounded by the
 * library, and the rollup to groups happens in JS where the mapping lives.
 *
 * The `unixepoch()` bound is SQL rather than a JS timestamp so the query text
 * never changes — a rebuilt query would resubscribe `useLiveQuery` on every
 * tick of the clock.
 */
export function muscleHitsQuery() {
  return db
    .select({
      exerciseId: exercises.id,
      primaryMuscles: exercises.primaryMuscles,
      secondaryMuscles: exercises.secondaryMuscles,
      lastHitAt: sql<number>`MAX(${sets.completedAt})`,
      recentSets: sql<number>`SUM(CASE WHEN ${sets.completedAt} >= (unixepoch() - ${RECENT_SECONDS}) * 1000 THEN 1 ELSE 0 END)`,
      // A scalar subquery for the same reason the history list uses one: the
      // name belongs to a single set's workout, which the GROUP BY has already
      // collapsed.
      lastWorkoutName: sql<string | null>`(SELECT w2.name FROM ${sets} s2
        JOIN ${workoutExercises} we2 ON we2.id = s2.workout_exercise_id
        JOIN ${workouts} w2 ON w2.id = we2.workout_id
        WHERE we2.exercise_id = ${exercises.id}
          AND s2.completed = 1 AND s2.completed_at IS NOT NULL
          AND s2.set_type <> 'warmup'
          AND s2.deleted_at IS NULL AND we2.deleted_at IS NULL AND w2.deleted_at IS NULL
        ORDER BY s2.completed_at DESC LIMIT 1)`,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .innerJoin(workouts, eq(workoutExercises.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutExercises.exerciseId, exercises.id))
    .where(
      and(
        eq(sets.completed, true),
        isNotNull(sets.completedAt),
        WORK_SETS,
        isNull(sets.deletedAt),
        isNull(workoutExercises.deletedAt),
        isNull(workouts.deletedAt),
      ),
    )
    .groupBy(exercises.id);
}

export type MuscleHit = Awaited<ReturnType<typeof muscleHitsQuery>>[number];

export type GroupRecovery = {
  group: MuscleGroup;
  /** 0 just trained, 1 fully recovered. */
  readiness: number;
  lastHitAt: number | null;
  lastWorkoutName: string | null;
  /** When readiness reaches 1; null once it already has. */
  readyAt: number | null;
  recentSets: number;
};

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/**
 * Every group, always, in the fixed order. A group's readiness is its *least*
 * recovered contribution, so the hit that finishes recovering last is the one
 * that owns the bar.
 */
export function recoveryByGroup(rows: readonly MuscleHit[], now: number): GroupRecovery[] {
  const state = new Map(
    MUSCLE_GROUPS.map((group): [MuscleGroup, GroupRecovery] => [
      group,
      {
        group,
        readiness: 1,
        lastHitAt: null,
        lastWorkoutName: null,
        readyAt: null,
        recentSets: 0,
      },
    ]),
  );

  const hit = (group: MuscleGroup, row: MuscleHit, factor: number) => {
    const entry = state.get(group);
    if (!entry || !row.lastHitAt) return;

    entry.recentSets += row.recentSets ?? 0;

    if (entry.lastHitAt == null || row.lastHitAt > entry.lastHitAt) {
      entry.lastHitAt = row.lastHitAt;
      entry.lastWorkoutName = row.lastWorkoutName;
    }

    const window = RECOVERY_WINDOW_HOURS[group] * HOUR_MS * factor;
    const readiness = clamp01((now - row.lastHitAt) / window);
    if (readiness < entry.readiness) {
      entry.readiness = readiness;
      entry.readyAt = row.lastHitAt + window;
    }
  };

  for (const row of rows) {
    const primary = muscleGroupsOf(row.primaryMuscles);
    for (const group of primary) hit(group, row, 1);
    for (const group of muscleGroupsOf(row.secondaryMuscles)) {
      if (!primary.includes(group)) hit(group, row, SECONDARY_FACTOR);
    }
  }

  return MUSCLE_GROUPS.map((group) => state.get(group)!);
}

/** "~14h", "~40m", or null once the group is ready. */
export function formatCountdown(entry: GroupRecovery, now: number): string | null {
  if (entry.readyAt == null || entry.readiness >= 1) return null;
  const minutes = Math.max(1, Math.round((entry.readyAt - now) / 60_000));
  return minutes < 60 ? `~${minutes}m` : `~${Math.round(minutes / 60)}h`;
}

/** "Ready", "Ready in ~14h", "Ready in ~40m". */
export function formatReadyIn(entry: GroupRecovery, now: number): string {
  const countdown = formatCountdown(entry, now);
  return countdown == null ? 'Ready' : `Ready in ${countdown}`;
}

/** "Sat, 8 Aug" — the sheet's last-trained line. */
export function formatLastTrained(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const parse = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const mix = (from: string, to: string, t: number) => {
  const a = parse(from);
  const b = parse(to);
  const channel = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
};

/**
 * Red through amber to green, continuous rather than three buckets, so a muscle
 * halfway back says whether it is nearly there rather than landing in a bucket.
 */
function readinessColor(readiness: number, theme: Theme): string {
  const t = clamp01(readiness);
  return t < 0.5
    ? mix(theme.danger, theme.warmup, t * 2)
    : mix(theme.warmup, theme.success, (t - 0.5) * 2);
}

/**
 * What the map actually paints. A recovered group drops to one flat muted
 * green: with every group on screen at once, saturating the ones that need no
 * attention buries the one that does. Colour means "still on the clock".
 */
export function recoveryFill(readiness: number, theme: Theme): string {
  return readiness >= 1 ? theme.successElement : readinessColor(readiness, theme);
}

export const isRecovering = (entry: GroupRecovery) => entry.readiness < 1;

/** What the map can't say on its own: which group is worst off, and for how long. */
export function recoveryCaption(
  groups: readonly GroupRecovery[],
  now: number,
): { label: string; countdown: string | null } {
  const recovering = groups.filter(isRecovering);
  if (recovering.length === 0) return { label: 'Everything recovered', countdown: null };

  const worst = recovering.reduce((a, b) => (b.readiness < a.readiness ? b : a));
  const others = recovering.length - 1;
  const name = MUSCLE_GROUP_SHORT_LABELS[worst.group];

  return {
    label: others === 0 ? name : `${name} +${others}`,
    countdown: formatCountdown(worst, now),
  };
}

/** Readiness by group, which is the only thing the body map needs. */
export function readinessByGroup(groups: readonly GroupRecovery[]): Record<MuscleGroup, number> {
  return Object.fromEntries(groups.map((entry) => [entry.group, entry.readiness])) as Record<
    MuscleGroup,
    number
  >;
}

/** The sheet's lead line — names the groups to leave alone, or says there are none. */
export function recoveryLead(groups: readonly GroupRecovery[]): string {
  const names = groups.filter(isRecovering).map((entry) => MUSCLE_GROUP_LABELS[entry.group]);
  if (names.length === 0) return 'Every group is recovered. Train whatever you like.';
  if (names.length === 1) return `${names[0]} is still recovering.`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are still recovering.`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are still recovering.`;
}
