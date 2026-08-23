import { useEffect, useState } from 'react';

import { Dialog } from '@/components/android/dialog';

export type NoticeOptions = {
  title: string;
  message: string;
};

let present: ((options: NoticeOptions) => void) | null = null;

/**
 * A one-button "here is what happened" dialog.
 *
 * Plain function rather than a hook for the same reason `prompt` is — the
 * callers run outside React — and split the same way: iOS keeps `Alert.alert`,
 * which is the real UIAlertController from a tab root, while everything else
 * would get Material's, so the dialog is drawn instead and reached through a
 * host mounted at the root.
 */
export function notice(options: NoticeOptions): void {
  present?.(options);
}

/** Mounted once, at the root — see `src/app/_layout.tsx`. */
export function NoticeHost() {
  const [pending, setPending] = useState<NoticeOptions | null>(null);

  useEffect(() => {
    present = setPending;
    return () => {
      present = null;
    };
  }, []);

  return (
    <Dialog
      open={pending != null}
      title={pending?.title ?? ''}
      message={pending?.message}
      onDismiss={() => setPending(null)}
      actions={[{ label: 'OK', onPress: () => setPending(null) }]}
    />
  );
}
