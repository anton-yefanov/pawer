import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';

import { attempt, report } from '@/lib/observability';
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

const PROMPTED_KEY = 'review_prompted';

// Asking while the sheet is still animating away can land the system alert on a
// view controller that is being torn down, and iOS then drops it silently.
const AFTER_DISMISS_MS = 700;

/**
 * The system rating sheet, once per install, after the first finished workout.
 * The flag is written before asking because iOS decides on its own whether to
 * show anything and never says — a retry would just spend the yearly quota.
 */
export async function requestReviewOnce(): Promise<void> {
  if (await getSetting(db, PROMPTED_KEY)) return;
  if (!(await StoreReview.isAvailableAsync())) return;
  await setSetting(db, PROMPTED_KEY, String(Date.now()));

  setTimeout(() => {
    StoreReview.requestReview().catch((error: unknown) => report('settings', error));
  }, AFTER_DISMISS_MS);
}
