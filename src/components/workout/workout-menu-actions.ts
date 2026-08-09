import { alertConfirm, type ConfirmDestructive } from '@/components/templates/card-actions';
import { type CardAction } from '@/components/templates/card-menu';
import { createTemplateFromWorkout } from '@/lib/template-actions';
import { deleteWorkout, repeatWorkout, type StartWorkoutResult } from '@/lib/workout-actions';

export type WorkoutMenuTarget = { id: string; name: string | null };

export function workoutActions(
  workout: WorkoutMenuTarget,
  handlers: {
    onEdit: () => void;
    onRepeat: (result: StartWorkoutResult) => void;
    onDeleted?: () => void;
    /** Callers inside a formSheet must pass their own — see card-actions.ts. */
    confirm?: ConfirmDestructive;
  }
): CardAction[] {
  const { onEdit, onRepeat, onDeleted, confirm = alertConfirm } = handlers;
  const name = workout.name?.trim() || 'Workout';

  return [
    { label: 'Edit Workout', systemImage: 'pencil', onPress: onEdit },
    {
      label: 'Save as Template',
      systemImage: 'square.and.arrow.down',
      onPress: () => void createTemplateFromWorkout(workout.id),
    },
    {
      label: 'Perform Again',
      systemImage: 'arrow.clockwise',
      onPress: () => void repeatWorkout(workout.id).then(onRepeat),
    },
    {
      label: 'Delete',
      systemImage: 'trash',
      destructive: true,
      separated: true,
      onPress: () =>
        confirm({
          title: `Delete “${name}”?`,
          body: 'This cannot be undone.',
          onConfirm: () => void deleteWorkout(workout.id).then(() => onDeleted?.()),
        }),
    },
  ];
}
