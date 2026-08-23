import { Alert, Button, Host, Spacer, Text } from '@expo/ui/swift-ui';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';

import * as haptics from '@/lib/haptics';

type Props = {
  open: boolean;
  onCompleteUnfinished: () => void;
  onCancelWorkout: () => void;
  onDismiss: () => void;
};

/** Same in-sheet presentation trick as `ConfirmAlert`, with a third action. */
export function ConfirmFinish({ open, onCompleteUnfinished, onCancelWorkout, onDismiss }: Props) {
  useEffect(() => {
    if (open) haptics.warn();
  }, [open]);

  return (
    <Host style={styles.host}>
      <Alert
        title="Finish Workout?"
        isPresented={open}
        onIsPresentedChange={(presented) => {
          if (!presented) onDismiss();
        }}>
        <Alert.Trigger>
          <Spacer />
        </Alert.Trigger>
        <Alert.Actions>
          <Button label="Complete Unfinished Sets" onPress={onCompleteUnfinished} />
          <Button role="destructive" label="Cancel Workout" onPress={onCancelWorkout} />
          <Button role="cancel" label="Cancel" onPress={onDismiss} />
        </Alert.Actions>
        <Alert.Message>
          <Text>There are valid sets in this workout that have not been marked as complete.</Text>
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
