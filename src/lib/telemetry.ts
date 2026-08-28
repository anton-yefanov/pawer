import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

import type { PaywallOutcome, PaywallSource } from '@/lib/paywall';
import type { TrackingType } from '@/lib/tracking-types';
import type { WeightUnit } from '@/lib/units';

/** Flip to true to send events from a dev build while checking the wiring. */
const TRACK_IN_DEV = false;

const config = (Constants.expoConfig?.extra?.posthog ?? {}) as {
  apiKey?: string;
  host?: string;
};

/**
 * Null rather than a client on an empty key: constructing one with `''` makes
 * the SDK `console.error`, which in dev is a red LogBox screen on every launch
 * for anyone who cloned the repo without the key.
 *
 * The instance is also deliberately not exported. `flush()` rejects when the
 * network is down, and this app has to survive a gym basement — keeping it
 * private means no call site can ever reach it. Everything below enqueues to
 * disk and returns immediately; the batch POST is the SDK's own problem.
 */
const client = config.apiKey
  ? new PostHog(config.apiKey, {
      host: config.host,
      disabled: __DEV__ && !TRACK_IN_DEV,
      captureAppLifecycleEvents: true,
      enableSessionReplay: false,
      // Everything this SDK can be talked out of asking for, it is: left at
      // their defaults, flags and push registration fire on every launch and
      // retry three times over a bad connection for answers nothing here reads.
      // One GET for remote config survives — `disableRemoteConfig` is a
      // deprecated no-op — but it runs after init, with no retries, a 3s
      // timeout and its own catch.
      preloadFeatureFlags: false,
      disableRemoteFeatureFlags: true,
      disableSurveys: true,
      capturePushNotificationSubscriptions: false,
      capturePushNotificationOpened: false,
    })
  : null;

if (!client) console.warn('[telemetry] no posthog.apiKey in app.json extra; analytics is off');

/**
 * Property values stay flat primitives so nothing inside the SDK can throw on
 * serialization — `capture` is called from the middle of `finishWorkout`, and a
 * failed analytics write must never cost a user their workout.
 */
type TelemetryEvents = {
  onboarding_step_viewed: { step: number; name: string };
  onboarding_completed: { unit: WeightUnit; notifications_granted: boolean };
  workout_started: { source: 'empty' | 'template' | 'repeat'; exercise_count: number };
  workout_finished: {
    duration_min: number;
    exercise_count: number;
    set_count: number;
    volume_kg: number;
    prs_earned: number;
    workout_index: number;
  };
  workout_cancelled: { had_sets: boolean };
  template_created: { source: 'blank' | 'from_workout' | 'duplicate'; exercise_count: number };
  custom_exercise_created: { tracking_type: TrackingType };
  paywall_shown: { source: PaywallSource };
  paywall_result: { source: PaywallSource; outcome: PaywallOutcome };
  pro_restored: { found: boolean };
  app_error: { scope: string; message: string };
};

export function track<K extends keyof TelemetryEvents>(
  event: K,
  properties: TelemetryEvents[K]
): void {
  if (!client) return;
  try {
    client.capture(event, properties);
  } catch (error) {
    warn('capture', error);
  }
}

export function screen(name: string): void {
  if (!client) return;
  try {
    void client.screen(name).catch((error: unknown) => warn('screen', error));
  } catch (error) {
    warn('screen', error);
  }
}

/** Super properties, so every event is filterable by plan and unit. */
export function registerContext(context: { isPro: boolean; weightUnit: WeightUnit }): void {
  if (!client) return;
  try {
    void client
      .register({ is_pro: context.isPro, weight_unit: context.weightUnit })
      .catch((error: unknown) => warn('register', error));
  } catch (error) {
    warn('register', error);
  }
}

/**
 * The SDK persists this itself and honours it before lifecycle events fire on
 * the next launch, which is what makes the Settings toggle a real opt-out
 * rather than a decoration.
 */
export function setOptedOut(next: boolean): void {
  if (!client) return;
  try {
    void (next ? client.optOut() : client.optIn()).catch((error: unknown) =>
      warn('optOut', error)
    );
  } catch (error) {
    warn('optOut', error);
  }
}

/**
 * There are no accounts, so PostHog's own anonymous id is the person and
 * nothing calls `identify`. This is only here to hand RevenueCat the id it
 * needs to attribute a subscription to the same person.
 */
export function distinctId(): string | null {
  if (!client) return null;
  try {
    return client.getDistinctId() || null;
  } catch (error) {
    warn('getDistinctId', error);
    return null;
  }
}

function warn(scope: string, error: unknown): void {
  console.warn(`[telemetry] ${scope} failed`, error);
}
