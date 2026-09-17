import { Alert } from 'react-native';

import type { NoticeOptions } from '@/lib/notice';

export function notice({ title, message, actions }: NoticeOptions): void {
  Alert.alert(
    title,
    message,
    actions?.map(({ label, role, onPress }) => ({
      text: label,
      style: role === 'destructive' || role === 'cancel' ? role : 'default',
      onPress,
    }))
  );
}

/** Nothing to mount — the system draws the alert. */
export function NoticeHost() {
  return null;
}
