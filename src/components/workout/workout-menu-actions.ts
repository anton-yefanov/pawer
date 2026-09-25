import { type CardAction, type ConfirmDestructive } from '@/components/templates/card-actions';
import { t } from '@/i18n';
import { attempt, guard } from '@/lib/observability';
import { allowNewTemplate } from '@/lib/pro-gates';
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
    isPro: boolean;
  }
): CardAction[] {
  const { onEdit, onRepeat, onDeleted, confirm, isPro } = handlers;
  const name = workout.name?.trim() || t('workout:defaultName');

  return [
    { label: t('workout:menu.edit'), icon: 'pencil', onPress: onEdit },
    {
      label: t('workout:menu.saveAsTemplate'),
      icon: 'square.and.arrow.down',
      onPress: () =>
        void guard('pro-gates', allowNewTemplate(isPro)).then(
          (allowed) =>
            allowed &&
            attempt('templates', createTemplateFromWorkout(workout.id), {
              title: t('workout:menu.saveTemplateFailed'),
              message: t('common:error.tryAgain'),
            })
        ),
    },
    {
      label: t('workout:menu.performAgain'),
      icon: 'arrow.clockwise',
      onPress: () =>
        void guard('workout', repeatWorkout(workout.id), {
          title: t('workout:menu.startFailed'),
          message: t('common:error.tryAgain'),
        }).then((result) => result && onRepeat(result)),
    },
    {
      label: t('common:action.delete'),
      icon: 'trash',
      destructive: true,
      separated: true,
      onPress: () =>
        confirm({
          title: t('common:deleteNamed', { name }),
          body: t('common:cannotUndo'),
          onConfirm: () =>
            void attempt('workout', deleteWorkout(workout.id), {
              title: t('workout:menu.deleteFailed'),
              message: t('common:error.tryAgain'),
            }).then((deleted) => deleted && onDeleted?.()),
        }),
    },
  ];
}
