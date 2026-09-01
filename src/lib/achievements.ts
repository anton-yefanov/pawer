import { TIERS, type AchievementTier } from '@/constants/achievement-tiers';
import { thresholdsFor, type LadderMetric, type ScaledExercise } from '@/lib/achievement-scale';
import { badgeKey } from '@/lib/achievement-news';
import type { AchievementSession } from '@/lib/achievement-queries';
import { trackingTypeOf, type TrackingType } from '@/lib/tracking-types';
import {
  distanceUnitFor,
  formatDistance,
  formatDuration,
  formatWeight,
  type WeightUnit,
} from '@/lib/units';

/**
 * What a tracking type can earn badges on, in the same spirit as `TRACKING` for
 * columns, `candidateValues` for record kinds and `METRICS` for charts: the only
 * place this feature switches on the type.
 *
 * Assisted bodyweight is scored on reps and never on load, for the reason
 * `candidateValues` refuses to score it at all — less assistance is the better
 * set, so a bigger `weightKg` is progress in reverse. Weighted bodyweight gets
 * two ladders because `weightKg` there is *added* load: an unweighted pull-up is
 * 0 kg, so reps alone tell the beginner's story and added weight the rest of it.
 * Cardio likewise earns on distance and on time, which are not the same feat.
 */
const LADDERS: Record<TrackingType, readonly LadderMetric[]> = {
  weight_reps: ['weight'],
  weighted_bodyweight: ['reps', 'added_weight'],
  assisted_bodyweight: ['reps'],
  bodyweight_reps: ['reps'],
  duration: ['hold'],
  distance_duration: ['distance', 'session_time'],
};

/** Shown only when an exercise has more than one ladder — otherwise the name says it. */
export const LADDER_TITLES: Record<LadderMetric, string> = {
  weight: 'Weight',
  added_weight: 'Added weight',
  reps: 'Reps',
  hold: 'Hold',
  distance: 'Distance',
  session_time: 'Time',
};

/**
 * Mobility work earns nothing. A three-minute hamstring stretch is not a feat,
 * and a badge for one cheapens the rest of the wall.
 */
export function laddersFor(exercise: {
  trackingType: string;
  category: string;
}): readonly LadderMetric[] {
  if (exercise.category === 'stretching') return [];
  return LADDERS[trackingTypeOf(exercise.trackingType)];
}

export function formatLadderValue(metric: LadderMetric, value: number, unit: WeightUnit): string {
  switch (metric) {
    case 'weight':
      return formatWeight(value, unit);
    case 'added_weight':
      return `+${formatWeight(value, unit)}`;
    case 'reps':
      return `${Math.round(value)} reps`;
    case 'hold':
    case 'session_time':
      return formatDuration(Math.round(value));
    case 'distance':
      return formatDistance(value, distanceUnitFor(unit));
  }
}

/** What one session of an exercise contributes to each ladder. */
function valueOf(metric: LadderMetric, session: AchievementSession): number {
  switch (metric) {
    case 'weight':
    case 'added_weight':
      return session.topWeightKg;
    case 'reps':
      return session.bestReps;
    case 'hold':
      return session.bestHoldSeconds;
    case 'distance':
      return session.distanceM;
    case 'session_time':
      return session.durationSeconds;
  }
}

export type Badge = {
  tier: AchievementTier;
  threshold: number;
  /** The first session that cleared it, or null while it is still a target. */
  unlockedAt: number | null;
};

export type Ladder = {
  metric: LadderMetric;
  badges: Badge[];
  best: number;
  unlocked: number;
};

export type ExerciseAchievements = {
  exerciseId: string;
  name: string;
  lastTrainedAt: number;
  ladders: Ladder[];
  unlocked: number;
};

/**
 * The whole feature, as a reduce over one query. Nothing is stored: an
 * achievement is a fact about the logged sets, so this works over history
 * logged long before the feature existed and can never disagree with it.
 *
 * `unlockedAt` is the *earliest* session that cleared the threshold rather than
 * the best one — the badge marks when it was first done.
 */
export function buildAchievements(sessions: readonly AchievementSession[]): ExerciseAchievements[] {
  const byExercise = new Map<string, AchievementSession[]>();
  for (const session of sessions) {
    const rows = byExercise.get(session.exerciseId);
    if (rows) rows.push(session);
    else byExercise.set(session.exerciseId, [session]);
  }

  const result: ExerciseAchievements[] = [];

  for (const rows of byExercise.values()) {
    const first = rows[0];
    const metrics = laddersFor(first);
    if (metrics.length === 0) continue;

    const scaled: ScaledExercise = {
      sourceId: first.sourceId,
      equipment: first.equipment,
      mechanic: first.mechanic,
      level: first.level,
      category: first.category,
      primaryMuscles: first.primaryMuscles,
      tags: first.tags,
    };

    const ladders = metrics.map((metric): Ladder => {
      const badges = thresholdsFor(metric, scaled).map((threshold, index): Badge => {
        const cleared = rows.filter((row) => valueOf(metric, row) >= threshold);
        return {
          tier: TIERS[index],
          threshold,
          unlockedAt: cleared.length === 0 ? null : Math.min(...cleared.map((r) => r.startedAt)),
        };
      });

      return {
        metric,
        badges,
        best: Math.max(...rows.map((row) => valueOf(metric, row))),
        unlocked: badges.filter((badge) => badge.unlockedAt != null).length,
      };
    });

    result.push({
      exerciseId: first.exerciseId,
      name: first.name,
      lastTrainedAt: Math.max(...rows.map((row) => row.startedAt)),
      ladders,
      unlocked: ladders.reduce((total, ladder) => total + ladder.unlocked, 0),
    });
  }

  return result.sort((a, b) => b.lastTrainedAt - a.lastTrainedAt);
}

export type EarnedBadge = {
  key: string;
  tier: AchievementTier;
  exerciseName: string;
};

/**
 * What one session unlocked. `unlockedAt` is the `startedAt` of the earliest
 * session that cleared the threshold, so a badge earned by this workout carries
 * this workout's own `startedAt` — no second query, and a badge that was
 * already standing before today is excluded by the same equality.
 */
export function badgesEarnedAt(
  items: readonly ExerciseAchievements[],
  startedAt: number
): EarnedBadge[] {
  const earned: EarnedBadge[] = [];

  for (const item of items) {
    for (const ladder of item.ladders) {
      for (const badge of ladder.badges) {
        if (badge.unlockedAt !== startedAt) continue;
        earned.push({
          key: badgeKey(item.exerciseId, ladder.metric, badge.tier.id),
          tier: badge.tier,
          exerciseName: item.name,
        });
      }
    }
  }

  return earned;
}
