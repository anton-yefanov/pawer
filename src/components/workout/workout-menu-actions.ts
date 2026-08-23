import { type CardAction, type ConfirmDestructive } from '@/components/templates/card-actions';
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
      onPress: () => void createTemplateFromWorkout(workout.id),
    },
    {
      label: 'Perform Again',
      icon: 'arrow.clockwise',
      onPress: () => void repeatWorkout(workout.id).then(onRepeat),
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
          onConfirm: () => void deleteWorkout(workout.id).then(() => onDeleted?.()),
        }),
    },
  ];
}
