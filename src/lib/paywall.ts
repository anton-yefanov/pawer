import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { PRO_ENTITLEMENT } from '@/lib/purchases';

/**
 * The paywall and the Customer Center are native screens built in the
 * RevenueCat dashboard — presenting them is the whole integration, and both
 * report back through the customer-info listener in `purchases.tsx`, so
 * nothing here has to update entitlement state itself.
 */

export type PaywallOutcome = 'purchased' | 'dismissed' | 'error';

export async function presentPaywall(): Promise<PaywallOutcome> {
  try {
    return outcomeOf(await RevenueCatUI.presentPaywall());
  } catch (error) {
    console.warn('[paywall] present failed', error);
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
    console.warn('[paywall] present failed', error);
    return 'error';
  }
}

export async function presentCustomerCenter(): Promise<void> {
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (error) {
    console.warn('[paywall] customer center failed', error);
  }
}

function outcomeOf(result: PAYWALL_RESULT): PaywallOutcome {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return 'purchased';
    case PAYWALL_RESULT.ERROR:
      return 'error';
    default:
      return 'dismissed';
  }
}
