import * as Haptics from 'expo-haptics';

/**
 * The app's whole haptic vocabulary. Intensity is chosen here, once, so a call
 * site says what happened rather than how hard to buzz.
 *
 * Plain functions, not a hook: the drag systems call these from Reanimated
 * worklets through `runOnJS`, and the menu action factories run outside React.
 *
 * Every call swallows its own rejection — expo-haptics rejects instead of
 * no-op'ing on a dev build older than the install, and a missed buzz shouldn't
 * redbox the logger.
 */

/** Ordinary buttons, rows, cards, menu items. */
export function tap() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A value changing: pick rows, toggles, selection ticks. */
export function select() {
  fire(Haptics.selectionAsync());
}

/** A drag lift, or a commit that carries weight. */
export function press() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** A set ticked, a workout finished, rest over. */
export function complete() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** A new personal record — the one thing that outranks finishing. */
export function reward() {
  fire(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  setTimeout(() => fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)), 120);
}

/** A destructive confirm raised, or an action refused for a reason worth reading. */
export function warn() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Validation refused, or a press that can't do anything yet. */
export function reject() {
  fire(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

function fire(result: Promise<void>) {
  result.catch(() => {});
}
