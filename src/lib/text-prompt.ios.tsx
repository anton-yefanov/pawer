import { Alert } from 'react-native';

import type { PromptOptions } from '@/lib/text-prompt';

/** `Alert.prompt` is a UIAlertController with a text field, and iOS-only. */
export function prompt({ title, confirmLabel, initialValue }: PromptOptions): Promise<string> {
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      undefined,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve('') },
        { text: confirmLabel, onPress: (value?: string) => resolve(value ?? '') },
      ],
      'plain-text',
      initialValue,
    );
  });
}

/** Nothing to mount — the system draws the alert. */
export function PromptHost() {
  return null;
}
