import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { TINTS } from '@/constants/tints';
import { workoutActivity, type WorkoutActivityProps } from '@/lib/live-activity-layout';
import { breadcrumb, guardSync, report } from '@/lib/observability';
import { useRestTimer } from '@/lib/rest-timer';
import { useResolvedTint } from '@/lib/theme-preference';
import { isWorkSet } from '@/lib/set-types';
import { formatTonnage } from '@/lib/units';
import { useIncludeWarmup } from '@/lib/warmup-stats';
import { useWeightUnit } from '@/lib/weight-unit';
import {
  activeWorkoutQuery,
  workoutExercisesQuery,
  workoutSetsQuery,
} from '@/lib/workout-queries';
import { currentPosition, totalVolumeKg, trackingByExercise } from '@/lib/workout-stats';

/**
 * Mirrors the active workout into an iOS Live Activity for as long as one is
 * running. Mounted at the root rather than in the logger, because the activity
 * has to outlive that screen — it unmounts the moment you switch tabs.
 *
 * The two clocks are absent from the payload on purpose: they're rendered from
 * `startedAt` and `endsAt` by SwiftUI itself, so nothing here fires per second.
 * What does go over is the set/volume/exercise state, and only when it actually
 * moves — set rows are rewritten on every debounced keystroke, and ActivityKit
 * throttles callers that update too often.
 */
export function WorkoutActivityProvider({ children }: { children: ReactNode }) {
  useWorkoutActivity();
  return children;
}

function useWorkoutActivity() {
  const unit = useWeightUnit();
  const rest = useRestTimer();
  const includeWarmup = useIncludeWarmup();
  // The activity always renders on black — the Dynamic Island and the Lock
  // Screen banner have no light variant — so it takes the dark scheme's accent
  // whatever the phone's current scheme is.
  const tint = TINTS[useResolvedTint()].dark.accent;

  const { data: activeRows, updatedAt } = useLiveQuery(activeWorkoutQuery(), []);
  const active = activeRows[0];
  const workoutId = active?.id ?? '';

  const { data: exerciseRows } = useLiveQuery(workoutExercisesQuery(workoutId), [workoutId]);
  const { data: setRows } = useLiveQuery(workoutSetsQuery(workoutId), [workoutId]);

  const previous = useRef<WorkoutActivityProps | null>(null);
  const startedId = useRef<string | null>(null);
  const stopping = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios' || workoutActivity == null) return;
    // `useLiveQuery` starts `data` at `[]`, not undefined, so an empty array is
    // indistinguishable from "no active workout" until the query has actually
    // run — and acting on it tears down a live activity on every cold start.
    // `updatedAt` is the only honest signal that a result has landed.
    if (updatedAt == null) return;

    if (!active) {
      // The other live queries keep firing while `stop` awaits, so without this
      // a second pass would grab the same instance and end it twice.
      if (!stopping.current) {
        stopping.current = true;
        void stop().finally(() => {
          stopping.current = false;
        });
      }
      startedId.current = null;
      previous.current = null;
      return;
    }

    const exercises = exerciseRows ?? [];
    const sets = setRows ?? [];
    const tracking = trackingByExercise(exercises);
    const counted = sets.filter((set) => isWorkSet(set, includeWarmup));
    const position = currentPosition(exercises, sets, tracking, includeWarmup);

    const setAt =
      position == null ? null : `Set ${position.setIndex} of ${position.setCount}`;

    const props: WorkoutActivityProps = {
      title: active.name?.trim() || 'Workout',
      // Rest is said by the bar alone, never by the headline. JS is suspended
      // while the phone is locked — exactly when the activity is on screen — so
      // nothing pushes an update the moment a rest runs out; a headline reading
      // "Rest" would sit there until the app came back, while a drained bar
      // beside the next set is already telling the truth.
      headline: position?.exerciseName ?? idle(exercises.length),
      subline: setAt,
      startedAt: active.startedAt,
      endedAt: null,
      restStartedAt: instant(rest.endsAt == null ? null : rest.endsAt - rest.total * 1000),
      restEndsAt: instant(rest.endsAt),
      setsLabel: `${counted.filter((set) => set.completed).length}/${counted.length} sets`,
      volumeLabel: formatTonnage(totalVolumeKg(sets, tracking, includeWarmup), unit),
      exercisesLabel: exercises.length === 1 ? '1 exercise' : `${exercises.length} exercises`,
      tint,
    };

    if (startedId.current !== active.id) {
      // Adopt an activity left running by a previous launch instead of stacking
      // a second one on top of it.
      const [existing] = workoutActivity.getInstances();
      // `start` is not a promise — it throws straight through JSI, and
      // ActivityKit raises whenever the user has Live Activities switched off
      // or the app is over the concurrent limit. Uncaught, that unmounts the
      // whole app mid-workout for a decoration.
      if (existing) {
        // `push` records the payload only once ActivityKit has taken it.
        push(existing, props, previous);
      } else {
        guardSync('live-activity', () =>
          workoutActivity?.start(props, `pawer://active?id=${active.id}`)
        );
        // `start` has no promise to wait on, so this is the only place to set it.
        previous.current = props;
      }
      breadcrumb('live-activity', existing ? 'activity adopted' : 'activity started');
      startedId.current = active.id;
      return;
    }

    if (previous.current != null && same(previous.current, props)) return;

    const [instance] = workoutActivity.getInstances();
    if (instance) push(instance, props, previous);
  }, [updatedAt, active, exerciseRows, setRows, rest.endsAt, rest.total, unit, includeWarmup, tint]);
}

/**
 * The widget layout turns these straight into `new Date(...)` and a SwiftUI
 * range. It runs in the extension's own runtime, where Sentry does not exist and
 * a throw is invisible everywhere, so a NaN has to be stopped on this side.
 */
function instant(value: number | null): number | null {
  return value != null && Number.isFinite(value) ? value : null;
}

/** No set is waiting to be filled: either nothing was added, or it's all logged. */
function idle(exerciseCount: number): string {
  return exerciseCount === 0 ? 'No exercises yet' : 'All sets done';
}

/**
 * The workout is over — finished or cancelled — so the activity goes with it.
 * A finished one used to hold a "Finished" summary on the Lock Screen for a
 * minute, which read as an activity that would not go away.
 *
 * `immediate` is load-bearing: ActivityKit's `default` policy keeps a finished
 * activity around for up to four hours.
 */
async function stop() {
  const [instance] = workoutActivity?.getInstances() ?? [];
  if (!instance) return;

  try {
    await instance.end('immediate');
  } catch {
    // The user can dismiss the activity from the Lock Screen, which leaves a
    // handle here that ActivityKit no longer knows about.
  }
}

function same(a: WorkoutActivityProps, b: WorkoutActivityProps): boolean {
  return (Object.keys(a) as (keyof WorkoutActivityProps)[]).every((key) => a[key] === b[key]);
}

/**
 * `previous` only advances once ActivityKit has taken the payload. Recording it
 * up front means a single rejected update — a throttle, or an activity the user
 * swiped away — matches on every later pass and freezes the Lock Screen on
 * stale numbers for the rest of the workout.
 */
function push(
  instance: { update: (props: WorkoutActivityProps) => Promise<void> },
  props: WorkoutActivityProps,
  previous: { current: WorkoutActivityProps | null }
): void {
  instance.update(props).then(
    () => {
      previous.current = props;
    },
    (error: unknown) => {
      report('live-activity', error, { phase: 'update' });
    }
  );
}
