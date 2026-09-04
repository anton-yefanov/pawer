import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

import type { AchievementTier } from '@/constants/achievement-tiers';
import type { PaywallOutcome, PaywallSource } from '@/lib/paywall';
import type { TrackingType } from '@/lib/tracking-types';
import type { WeightUnit } from '@/lib/units';

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
      // Product analytics are enabled by default. They contain only the
      // allowlisted events below and never include workout content.
      disabled: false,
      disableGeoip: true,
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
  onboarding_step_viewed: { name: string };
  onboarding_completed: { notifications_granted: boolean };
  workout_started: { source: 'empty' | 'template' | 'repeat' };
  workout_finished: Record<never, never>;
  workout_cancelled: Record<never, never>;
  template_created: { source: 'blank' | 'from_workout' | 'duplicate' };
  custom_exercise_created: { tracking_type: TrackingType };
  paywall_shown: { source: PaywallSource };
  paywall_result: { source: PaywallSource; outcome: PaywallOutcome };
  pro_restored: { found: boolean };
  support_message_sent: { sent: boolean };
  achievements_opened: Record<never, never>;
  achievement_badge_viewed: Record<never, never>;
  achievement_shared: { tier: AchievementTier['id']; action: 'share' | 'save' };
  review_opened: { source: 'settings' };
  app_error: { scope: string };
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

/** Super properties, so every consented event is filterable by plan and unit. */
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

/** Enables collection for existing installs that previously selected Not Now. */
export function enableTelemetry(): void {
  if (!client) return;
  try {
    void client.optIn().catch((error: unknown) => warn('optIn', error));
  } catch (error) {
    warn('optIn', error);
  }
}

function warn(scope: string, error: unknown): void {
  console.warn(`[telemetry] ${scope} failed`, error);
}
