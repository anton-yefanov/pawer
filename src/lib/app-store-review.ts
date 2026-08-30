import { Linking } from 'react-native';

import { attempt } from '@/lib/observability';
import { track } from '@/lib/telemetry';

/** The App Store Connect "Apple ID" for Pawer. Public, permanent, not a secret. */
const APP_STORE_ID = '6805974421';

const REVIEW_PATH = `apps.apple.com/app/id${APP_STORE_ID}?action=write-review`;

const OPEN_FAILED = {
  title: 'Couldn’t open the App Store',
  message: 'Please try again.',
};

/**
 * `itms-apps` opens the App Store app straight onto the review composer with no
 * Safari bounce; the https form is the fallback for anywhere that scheme isn't
 * handled, notably the Simulator.
 */
export async function openReview(): Promise<void> {
  const native = `itms-apps://${REVIEW_PATH}`;
  const url = (await Linking.canOpenURL(native).catch(() => false))
    ? native
    : `https://${REVIEW_PATH}`;

  track('review_opened', { source: 'settings' });
  await attempt('settings', Linking.openURL(url), OPEN_FAILED);
}
