import { Alert, Button, Host, Spacer, Text } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { t } from '@/i18n';
import * as haptics from '@/lib/haptics';

type Props = {
  open: boolean;
  onCompleteUnfinished: () => void;
  onCancelWorkout: () => void;
  onDismiss: () => void;
};

/** Same in-sheet presentation trick as `ConfirmAlert`, with a third action. */
export function ConfirmFinish({ open, onCompleteUnfinished, onCancelWorkout, onDismiss }: Props) {
  const theme = useTheme();
  useEffect(() => {
    if (open) haptics.warn();
  }, [open]);

  return (
    <Host style={styles.host}>
      <Alert
        modifiers={[tint(theme.accent)]}
        title={t('workout:finish.title')}
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}>
        <Alert.Trigger>
          <Spacer />
        </Alert.Trigger>
        <Alert.Actions>
          <Button label={t('workout:finish.completeUnfinished')} onPress={onCompleteUnfinished} />
          <Button role="destructive" label={t('workout:finish.cancelWorkout')} onPress={onCancelWorkout} />
          <Button role="cancel" label={t('common:action.cancel')} onPress={onDismiss} />
        </Alert.Actions>
        <Alert.Message>
          <Text>{t('workout:finish.unfinished')}</Text>
        </Alert.Message>
      </Alert>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    width: 0,
    height: 0,
  },
});
