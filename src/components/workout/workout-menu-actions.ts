import { type CardAction, type ConfirmDestructive } from '@/components/templates/card-actions';
import { attempt, guard } from '@/lib/observability';
import { createTemplateFromWorkout } from '@/lib/template-actions';
import { deleteWorkout, repeatWorkout, type StartWorkoutResult } from '@/lib/workout-actions';

export type WorkoutMenuTarget = { id: string; name: string | null };

export function workoutActions(
  workout: WorkoutMenuTarget,
  handlers: {
    onEdit: () => void;
    onRepeat: (result: StartWorkoutResult) => void;
    onDeleted?: () => void;
    confirm: ConfirmDestructive;
  }
): CardAction[] {
  const { onEdit, onRepeat, onDeleted, confirm } = handlers;
  const name = workout.name?.trim() || 'Workout';

  return [
    { label: 'Edit Workout', icon: 'pencil', onPress: onEdit },
    {
      label: 'Save as Template',
      icon: 'square.and.arrow.down',
      onPress: () =>
        void attempt('templates', createTemplateFromWorkout(workout.id), {
          title: 'Couldn’t save template',
          message: 'Please try again.',
        }),
    },
    {
      label: 'Perform Again',
      icon: 'arrow.clockwise',
      onPress: () =>
        void guard('workout', repeatWorkout(workout.id), {
          title: 'Couldn’t start workout',
          message: 'Please try again.',
        }).then((result) => result && onRepeat(result)),
    },
    {
      label: 'Delete',
      icon: 'trash',
      destructive: true,
      separated: true,
      onPress: () =>
        confirm({
          title: `Delete “${name}”?`,
          body: 'This cannot be undone.',
          onConfirm: () =>
            void attempt('workout', deleteWorkout(workout.id), {
              title: 'Couldn’t delete workout',
              message: 'Please try again.',
            }).then((deleted) => deleted && onDeleted?.()),
        }),
    },
  ];
}
