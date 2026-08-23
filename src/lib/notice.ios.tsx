import { Alert } from 'react-native';

import type { NoticeOptions } from '@/lib/notice';

export function notice({ title, message }: NoticeOptions): void {
  Alert.alert(title, message);
}

/** Nothing to mount — the system draws the alert. */
export function NoticeHost() {
  return null;
}
