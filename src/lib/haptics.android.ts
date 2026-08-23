import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';

/**
 * The same vocabulary as `haptics.ts`, on Android's haptics engine.
 *
 * The split is a whole file rather than a `Platform.OS` guard because none of
 * the iOS entry points are the right call here: `impactAsync`,
 * `selectionAsync` and `notificationAsync` all reach Android's `Vibrator` —
 * a buzz that needs the `VIBRATE` permission and ignores the user's
 * touch-feedback setting. `performAndroidHapticsAsync` is the ticks the system
 * UI itself uses, so every verb routes through it instead.
 *
 * Constant availability is spread across API levels and expo-haptics rejects
 * rather than degrading, so anything above API 30 carries a second choice.
 * Only `Clock_Tick`, `Context_Click`, `Keyboard_Tap`, `Long_Press` and
 * `Virtual_Key` exist on every level, which is what the four verbs on the
 * hottest paths are picked from.
 */

/** Ordinary buttons, rows, cards, menu items. */
export function tap() {
  fire(AndroidHaptics.Virtual_Key);
}

/** A value changing: pick rows, toggles, selection ticks. */
export function select() {
  fire(AndroidHaptics.Clock_Tick);
}

/** A drag lift, or a commit that carries weight. */
export function press() {
  fire(AndroidHaptics.Long_Press);
}

/** A set ticked, a workout finished, rest over. */
export function complete() {
  fire(AndroidHaptics.Confirm, AndroidHaptics.Virtual_Key);
}

/** A new personal record — the one thing that outranks finishing. */
export function reward() {
  press();
  setTimeout(complete, 120);
}

/**
 * A destructive confirm raised, or an action refused for a reason worth reading.
 * Android has no warning tier; a heavier tick than `tap` is the whole distinction.
 */
export function warn() {
  fire(AndroidHaptics.Context_Click);
}

/** Validation refused, or a press that can't do anything yet. */
export function reject() {
  fire(AndroidHaptics.Reject, AndroidHaptics.Long_Press);
}

function fire(primary: AndroidHaptics, fallback?: AndroidHaptics) {
  performAndroidHapticsAsync(primary).catch(() => {
    if (fallback) performAndroidHapticsAsync(fallback).catch(() => {});
  });
}
