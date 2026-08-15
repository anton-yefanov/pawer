export type PaywallOutcome = 'purchased' | 'dismissed' | 'error';

/** `react-native-purchases-ui` is native-only; the web build never sells. */
export async function presentPaywall(): Promise<PaywallOutcome> {
  return 'dismissed';
}

export async function presentPaywallIfNeeded(): Promise<PaywallOutcome> {
  return 'dismissed';
}

export async function presentCustomerCenter(): Promise<void> {}
