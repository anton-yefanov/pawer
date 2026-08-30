import { router } from 'expo-router';

/**
 * How long to let the sheets that are on screen finish going away. A dismiss
 * and a present in the same tick make RNSScreenStack bail out (see
 * (workout)/_layout.tsx), so the recap waits the dismissal out rather than
 * racing it.
 */
const DISMISS_MS = 200;

/**
 * Closes the logger — and whatever sheet it was started from — and brings the
 * recap up over the tab's root. Deliberately the imperative `router` and a bare
 * timer: the screen that finished the workout is unmounted long before the push
 * runs, so there is nothing left to hang the navigation off.
 */
export function presentWorkoutSummary(
  id: string,
  pathname: '/summary' | '/history/workout-summary',
) {
  router.dismissAll();
  setTimeout(() => router.push({ pathname, params: { id } }), DISMISS_MS);
}
