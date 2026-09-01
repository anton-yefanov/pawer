import { TIERS } from '@/constants/achievement-tiers';
import { groupOfExercise } from '@/lib/exercise-groups';

/**
 * What a ladder counts. Not the same list as `SetField`: cardio is scored on the
 * session rather than the set, because an interval run logs six sets and "ran
 * 10 km" is plainly the whole session, while a plank is one hold and its best
 * set is the achievement.
 */
export type LadderMetric = 'weight' | 'added_weight' | 'reps' | 'hold' | 'distance' | 'session_time';

/** The library metadata a base value is derived from. */
export type ScaledExercise = {
  sourceId: string | null;
  equipment: string | null;
  mechanic: string | null;
  level: string;
  category: string;
  primaryMuscles: string[];
  tags: string[];
};

/**
 * The heart of the feature: what a *respectable* effort is, per exercise, in
 * canonical units. Authoring 412 × 5 thresholds by hand is not maintainable, so
 * a weight base is derived from the metadata every seeded exercise already
 * carries — its muscle group, whether it isolates, and what it is loaded with —
 * and only the lifts whose numbers everyone has an opinion about are named
 * outright below.
 *
 * Read a number as "the barbell weight a Gold badge asks for in this group".
 * The equipment factor then takes it to the implement actually being used, and
 * for dumbbells and kettlebells that is *per hand*, because that is what a set
 * row stores.
 */
const BASE_KG: Record<string, { compound: number; isolation: number }> = {
  abs: { compound: 60, isolation: 90 },
  back: { compound: 100, isolation: 55 },
  biceps: { compound: 60, isolation: 40 },
  calves: { compound: 150, isolation: 160 },
  chest: { compound: 90, isolation: 40 },
  forearms: { compound: 50, isolation: 30 },
  glutes: { compound: 130, isolation: 30 },
  legs: { compound: 130, isolation: 90 },
  shoulders: { compound: 65, isolation: 25 },
  traps: { compound: 110, isolation: 120 },
  triceps: { compound: 90, isolation: 45 },
};

const EQUIPMENT_FACTOR: Record<string, number> = {
  barbell: 1,
  machine: 0.9,
  'cable machine': 0.6,
  dumbbell: 0.4,
  kettlebell: 0.35,
  band: 0.12,
  'weight plate': 0.3,
  sled: 1.3,
  bench: 0.5,
  'stability ball': 0.3,
  'wrist roller': 0.2,
};

/**
 * Where the formula is provably wrong, or where a lifter already knows what the
 * number should be. Adding to this table is the tuning workflow — never edit a
 * factor above to fix one exercise.
 */
const WEIGHT_BASE: Record<string, number> = {
  'barbell-deadlift': 150,
  'trap-bar-deadlift': 160,
  'snatch-grip-deadlift': 130,
  'deficit-deadlift': 130,
  'barbell-romanian-deadlift': 120,
  'barbell-stiff-leg-deadlifts': 110,
  'barbell-bench-press': 100,
  'barbell-thruster': 70,
  'barbell-step-up-knee-drive': 60,
  'barbell-front-rack-step-up-knee-drive': 60,
  'dumbbell-single-leg-hip-thrust': 25,
  'front-squat': 110,
  'smith-machine-front-squat': 100,
  'machine-leg-press': 220,
  'machine-horizontal-leg-press': 200,
  'single-leg-press': 110,
  'barbell-hip-thrust': 140,
  'machine-hip-thrust': 160,
  'power-clean': 90,
  'hang-power-clean': 80,
  'hang-clean': 80,
  'barbell-clean-and-press': 70,
  'dumbbell-single-arm-clean-and-press': 30,
  'dumbbell-single-leg-calf-raise': 30,
  'seated-calf-raise': 35,
  'kettlebell-calf-raise': 30,
  'hang-snatch': 60,
  'split-jerk': 80,
  'sissy-squat': 20,
  'standing-cable-hip-abduction': 25,
  'machine-hip-abduction': 90,
  'dumbbell-goblet-squat': 40,
  'sled-push': 120,
  'sled-pull': 120,
  'kettlebell-sumo-deadlift': 48,
};

/** Added load on a bodyweight movement, which is a different scale entirely. */
const ADDED_WEIGHT_BASE: Record<string, number> = {
  'pull-ups': 25,
  'weighted-pull-ups': 30,
  'chin-ups': 25,
  'neutral-grip-pull-up': 25,
  'wide-grip-pull-up': 20,
  'parralel-bar-dips': 40,
  'bench-dips': 30,
  'toes-to-bar': 10,
  'hanging-knee-raises': 10,
  'captains-chair-knee-raise': 10,
  'decline-sit-up': 20,
  'back-extension': 40,
  'single-leg-back-extension': 20,
};

const REPS_BASE: Record<string, number> = {
  'push-up': 40,
  'bodyweight-knee-push-ups': 40,
  'incline-push-up': 40,
  'decline-push-up': 30,
  'bodyweight-elevated-push-up': 30,
  'diamond-push-ups': 25,
  'pull-ups': 12,
  'chin-ups': 12,
  'neutral-grip-pull-up': 12,
  'wide-grip-pull-up': 10,
  'weighted-pull-ups': 8,
  'band-assisted-pull-up': 15,
  'machine-assisted-pull-up': 15,
  'machine-dips': 15,
  'parralel-bar-dips': 20,
  'bench-dips': 25,
  'inverted-row': 20,
  'toes-to-bar': 15,
  'bodyweight-squat': 50,
  'jump-squats': 30,
  'box-jump': 20,
  burpee: 25,
  'mountain-climber': 50,
  'bird-dog': 20,
  'dead-bug': 20,
  'bodyweight-russian-twist': 40,
  supermans: 30,
  'glute-bridge': 40,
  'single-leg-glute-bridge': 25,
  'nordic-hamstring-curl': 8,
  'hanging-knee-raises': 20,
  'captains-chair-knee-raise': 20,
  'decline-sit-up': 25,
  'decline-crunch': 30,
  'back-extension': 20,
  'single-leg-back-extension': 15,
  'v-up': 25,
  'lunge-walking': 30,
  'neck-curl': 20,
  'neck-extension': 20,
  'tibialis-raise': 30,
  'single-leg-standing-calf-raise': 30,
  'bodyweight-donkey-calf-raise': 30,
};

/** Beginner movements are the ones you do many of. */
const REPS_BASE_BY_LEVEL: Record<string, number> = {
  beginner: 25,
  intermediate: 15,
  advanced: 10,
  expert: 10,
};

/** Seconds, for a single hold. */
const HOLD_BASE: Record<string, number> = {
  'front-plank': 120,
  'hand-plank': 120,
  'elbow-side-plank': 90,
  'wall-sit': 120,
  'dead-hang': 60,
  'split-squat-isometric-hold': 60,
  'kettlebell-farmers-carry': 90,
  'battle-ropes': 60,
  'jump-rope': 300,
  'jumping-jack': 180,
  'shadow-boxing': 300,
  'cycling-warmup': 600,
  'cycling-cooldown': 600,
};

/** Metres and seconds, per session, for the 29 `distance_duration` exercises. */
const CARDIO_BASE: Record<string, { distance?: number; time?: number }> = {
  'treadmill-run': { distance: 5000 },
  'long-run': { distance: 10000, time: 3600 },
  'tempo-run': { distance: 8000 },
  'trail-run': { distance: 8000, time: 3600 },
  'running-intervals': { distance: 5000 },
  'running-cooldown': { distance: 2000, time: 900 },
  'incline-treadmill-walk': { distance: 3000 },
  'stair-climber': { distance: 3000 },
  versaclimber: { distance: 2000 },
  elliptical: { distance: 8000 },
  'arc-trainer': { distance: 8000 },
  'ski-erg': { distance: 5000 },
  hiking: { distance: 10000, time: 7200 },
  'cycling-intervals': { distance: 20000 },
  'cycling-sprint': { distance: 10000 },
  'hill-climb-repeats': { distance: 15000 },
  'indoor-cycling-spin': { distance: 20000 },
  'steady-state-ride': { distance: 40000, time: 5400 },
  'assault-bike': { distance: 10000 },
  'rowing-intervals': { distance: 5000 },
  'rowing-sprint': { distance: 2000 },
  'rowing-machine-steady-state': { distance: 8000 },
  'freestyle-swim': { distance: 1500 },
  'backstroke-swim': { distance: 1000 },
  'breaststroke-swim': { distance: 1000 },
  'butterfly-swim': { distance: 500 },
  'swim-kick-drill': { distance: 800 },
  'swim-pull-drill': { distance: 800 },
  'swim-sprint-intervals': { distance: 1000 },
};

const DEFAULTS: Record<LadderMetric, number> = {
  weight: 40,
  added_weight: 20,
  reps: 15,
  hold: 60,
  distance: 5000,
  session_time: 1800,
};

/**
 * A split squat asks for about half the weight the two-legged version does. Legs
 * and glutes only: an upper-body movement logged one side at a time is a
 * dumbbell or a cable, and its own factor is already per hand.
 *
 * `tags` carries the vocabulary (`unilateral`, `single leg`), because laterality
 * is not a column — and a term missing from a tag list belongs in
 * scripts/exercise-tags.mjs, like every other one.
 */
function unilateralFactor(exercise: ScaledExercise, group: string): number {
  if (group !== 'legs' && group !== 'glutes') return 1;

  const oneSided = exercise.tags.some(
    (tag) => tag.includes('unilateral') || tag.includes('single leg')
  );
  return oneSided ? 0.5 : 1;
}

function weightBase(exercise: ScaledExercise): number {
  const override = exercise.sourceId == null ? undefined : WEIGHT_BASE[exercise.sourceId];
  if (override != null) return override;

  const group = groupOfExercise(exercise);
  const base = group == null ? undefined : BASE_KG[group];
  const factor = exercise.equipment == null ? undefined : EQUIPMENT_FACTOR[exercise.equipment];
  if (group == null || base == null || factor == null) return DEFAULTS.weight;

  const scale = exercise.mechanic === 'isolation' ? base.isolation : base.compound;

  return scale * factor * unilateralFactor(exercise, group);
}

function baseFor(metric: LadderMetric, exercise: ScaledExercise): number {
  const sourceId = exercise.sourceId;

  switch (metric) {
    case 'weight':
      return weightBase(exercise);
    case 'added_weight':
      return (sourceId == null ? undefined : ADDED_WEIGHT_BASE[sourceId]) ?? DEFAULTS.added_weight;
    case 'reps':
      return (
        (sourceId == null ? undefined : REPS_BASE[sourceId]) ??
        REPS_BASE_BY_LEVEL[exercise.level] ??
        DEFAULTS.reps
      );
    case 'hold':
      return (sourceId == null ? undefined : HOLD_BASE[sourceId]) ?? DEFAULTS.hold;
    case 'distance':
      return (
        (sourceId == null ? undefined : CARDIO_BASE[sourceId]?.distance) ?? DEFAULTS.distance
      );
    case 'session_time':
      return (sourceId == null ? undefined : CARDIO_BASE[sourceId]?.time) ?? DEFAULTS.session_time;
  }
}

/**
 * A threshold nobody would write down is a threshold nobody believes. Weights
 * land on the plates a gym actually has, distances on the marks a runner
 * counts, and the step grows with the number so 2.5 kg still matters at 15 kg
 * and never appears at 200.
 */
function step(metric: LadderMetric, value: number): number {
  switch (metric) {
    case 'weight':
    case 'added_weight':
      if (value < 20) return 2.5;
      if (value < 100) return 5;
      if (value < 200) return 10;
      return 20;
    case 'reps':
      return value < 10 ? 1 : 5;
    case 'hold':
      if (value < 120) return 15;
      if (value < 600) return 30;
      return 300;
    case 'session_time':
      return value < 1800 ? 300 : 600;
    case 'distance':
      if (value < 1000) return 100;
      if (value < 2000) return 250;
      if (value < 5000) return 500;
      return 1000;
  }
}

function round(metric: LadderMetric, value: number): number {
  const size = step(metric, value);
  return Math.max(size, Math.round(value / size) * size);
}

/**
 * The five thresholds, in canonical units — kilograms, reps, seconds, metres.
 * Never converted here: a pounds user unlocks the same badge at the same lift,
 * and the display layer is the only thing that knows about pounds.
 *
 * Gold is the base itself and skips rounding, so the number the table above
 * authored is the number on the badge. Rounding the others can still collapse
 * two neighbouring tiers onto the same value at the small end — two badges
 * asking for the same thing — so each one is bumped past the one before it.
 */
export function thresholdsFor(metric: LadderMetric, exercise: ScaledExercise): number[] {
  const base = round(metric, baseFor(metric, exercise));

  return TIERS.reduce<number[]>((thresholds, tier) => {
    const previous = thresholds[thresholds.length - 1];
    const value = tier.multiplier === 1 ? base : round(metric, base * tier.multiplier);

    thresholds.push(
      previous != null && value <= previous ? previous + step(metric, previous) : value
    );
    return thresholds;
  }, []);
}
