import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { after } from 'expo-widgets';
import { useEffect, useRef, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { Colors } from '@/constants/theme';
import { workoutActivity, type WorkoutActivityProps } from '@/lib/live-activity-layout';
import { useRestTimer } from '@/lib/rest-timer';
import { isWorkSet } from '@/lib/set-types';
import { formatTonnage } from '@/lib/units';
import { useWeightUnit } from '@/lib/weight-unit';
import {
  activeWorkoutQuery,
  workoutExercisesQuery,
  workoutQuery,
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

/**
 * The activity always renders on black — the Dynamic Island and the Lock Screen
 * banner have no light variant — so it takes the dark scheme's accent rather
 * than the app's current one, which would be the duller `#007AFF` whenever the
 * phone is in light mode.
 */
const TINT = Colors.dark.accent;

function useWorkoutActivity() {
  const unit = useWeightUnit();
  const rest = useRestTimer();

  const { data: activeRows, updatedAt } = useLiveQuery(activeWorkoutQuery(), []);
  const active = activeRows[0];
  const workoutId = active?.id ?? '';

  const { data: exerciseRows } = useLiveQuery(workoutExercisesQuery(workoutId), [workoutId]);
  const { data: setRows } = useLiveQuery(workoutSetsQuery(workoutId), [workoutId]);

  const previous = useRef<WorkoutActivityProps | null>(null);
  const startedId = useRef<string | null>(null);
  const stopping = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
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
        void stop(startedId.current, previous.current).finally(() => {
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
    const workSets = sets.filter(isWorkSet);
    const position = currentPosition(exercises, sets, tracking);

    const resting = rest.endsAt != null;
    const setAt =
      position == null ? null : `Set ${position.setIndex} of ${position.setCount}`;

    const props: WorkoutActivityProps = {
      title: active.name?.trim() || 'Workout',
      headline: resting ? 'Rest' : (position?.exerciseName ?? idle(exercises.length)),
      subline: resting
        ? position && `Next: ${position.exerciseName}`
        : setAt,
      startedAt: active.startedAt,
      endedAt: null,
      restStartedAt: rest.endsAt == null ? null : rest.endsAt - rest.total * 1000,
      restEndsAt: rest.endsAt,
      setsLabel: `${workSets.filter((set) => set.completed).length}/${workSets.length} sets`,
      volumeLabel: formatTonnage(totalVolumeKg(sets, tracking), unit),
      exercisesLabel: exercises.length === 1 ? '1 exercise' : `${exercises.length} exercises`,
      tint: TINT,
    };

    if (startedId.current !== active.id) {
      // Adopt an activity left running by a previous launch instead of stacking
      // a second one on top of it.
      const [existing] = workoutActivity.getInstances();
      if (existing) void existing.update(props);
      else workoutActivity.start(props, `pawer://active?id=${active.id}`);
      startedId.current = active.id;
      previous.current = props;
      return;
    }

    if (previous.current != null && same(previous.current, props)) return;
    previous.current = props;

    const [instance] = workoutActivity.getInstances();
    if (instance) void instance.update(props);
  }, [updatedAt, active, exerciseRows, setRows, rest.endsAt, rest.total, unit]);
}

/** No set is waiting to be filled: either nothing was added, or it's all logged. */
function idle(exerciseCount: number): string {
  return exerciseCount === 0 ? 'No exercises yet' : 'All sets done';
}

/** How long a finished workout's summary stays on the Lock Screen. */
const LINGER_MS = 60_000;

/**
 * A finished workout gets its summary held on screen for a moment; a cancelled
 * one is gone and shouldn't linger on the Lock Screen at all. Both leave
 * `activeWorkoutQuery` the same way, so the row itself has to say which it was.
 *
 * The linger is an explicit `after` date: ActivityKit's `default` policy is not
 * "a moment" but up to four hours, which reads as an activity that never went
 * away. The final payload is what stops the elapsed clock — SwiftUI keeps
 * ticking it after the activity ends, so the last content has to cap its range.
 *
 * A null id is an activity this launch never started — left over from a session
 * that was killed — and there's nothing to hold on screen for.
 */
async function stop(workoutId: string | null, last: WorkoutActivityProps | null) {
  const [instance] = workoutActivity.getInstances();
  if (!instance) return;

  const workout = workoutId == null ? null : (await workoutQuery(workoutId))[0];
  const finishedAt = workout?.finishedAt ?? null;

  const final: WorkoutActivityProps | undefined =
    finishedAt == null || last == null
      ? undefined
      : {
          ...last,
          headline: 'Finished',
          subline: null,
          endedAt: finishedAt,
          restStartedAt: null,
          restEndsAt: null,
        };

  try {
    await instance.end(
      finishedAt == null ? 'immediate' : after(new Date(Date.now() + LINGER_MS)),
      final
    );
  } catch {
    // The user can dismiss the activity from the Lock Screen, which leaves a
    // handle here that ActivityKit no longer knows about.
  }
}

function same(a: WorkoutActivityProps, b: WorkoutActivityProps): boolean {
  return (Object.keys(a) as (keyof WorkoutActivityProps)[]).every((key) => a[key] === b[key]);
}
