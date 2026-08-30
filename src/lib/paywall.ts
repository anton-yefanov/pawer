import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { notice } from '@/lib/notice';
import { report } from '@/lib/observability';
import { PRO_ENTITLEMENT } from '@/lib/purchases';
import { track } from '@/lib/telemetry';

/**
 * The paywall and the Customer Center are native screens built in the
 * RevenueCat dashboard — presenting them is the whole integration, and both
 * report back through the customer-info listener in `purchases.tsx`, so
 * nothing here has to update entitlement state itself.
 */

export type PaywallOutcome = 'purchased' | 'dismissed' | 'error';

/**
 * Which gate raised the paywall. RevenueCat's own events can't know this, and
 * it is the whole point of measuring the placement at all — §4 of the plan bets
 * on the first-workout one, and this is what tells us whether the bet paid.
 */
export type PaywallSource =
  | 'first_workout'
  | 'template_limit'
  | 'custom_exercise_limit'
  | 'analytics_period'
  | 'settings'
  | 'exercise_progress';

export async function presentPaywall(source: PaywallSource): Promise<PaywallOutcome> {
  track('paywall_shown', { source });
  const outcome = await present();
  track('paywall_result', { source, outcome });
  // Every gate only checks for 'purchased', so without this a purchase that
  // failed on a bad connection is indistinguishable from the user saying no —
  // they get refused again with no explanation.
  if (outcome === 'error') {
    notice({
      title: 'Purchase didn\u2019t complete',
      message: 'Something went wrong. Please check your connection and try again.',
    });
  }
  return outcome;
}

async function present(): Promise<PaywallOutcome> {
  try {
    return outcomeOf(await RevenueCatUI.presentPaywall());
  } catch (error) {
    report('paywall', error, { phase: 'present' });
    return 'error';
  }
}

/** Presents nothing when the entitlement is already active. */
export async function presentPaywallIfNeeded(): Promise<PaywallOutcome> {
  try {
    return outcomeOf(
      await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: PRO_ENTITLEMENT,
      })
    );
  } catch (error) {
    report('paywall', error, { phase: 'present-if-needed' });
    return 'error';
  }
}

export async function presentCustomerCenter(): Promise<void> {
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    report('paywall', error, { phase: 'customer-center' });
    notice({
      title: 'Couldn\u2019t open subscriptions',
      message: 'Please check your connection and try again.',
    });
  }
}

function outcomeOf(result: PAYWALL_RESULT): PaywallOutcome {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return 'purchased';
    case PAYWALL_RESULT.ERROR:
      report('paywall', new Error('RevenueCat returned PAYWALL_RESULT.ERROR'));
      return 'error';
    default:
      return 'dismissed';
  }
}
