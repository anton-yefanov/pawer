import { CircleButton } from '@/components/circle-button';
import { t } from '@/i18n';
import { useRestTimer } from '@/lib/rest-timer';

/** No SwiftUI timer text on web — just the affordance that scrolls to the row. */
export function RestTimerButton({ onPress }: { onPress: () => void }) {
  const rest = useRestTimer();
  if (rest.setId == null) return null;
  return <CircleButton symbol="timer" label={t('workout:rest.show')} onPress={onPress} />;
}
