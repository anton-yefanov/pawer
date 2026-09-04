export type PaywallOutcome = 'purchased' | 'dismissed' | 'error';

export type PaywallSource =
  | 'template_limit'
  | 'custom_exercise_limit'
  | 'analytics_period'
  | 'settings'
  | 'exercise_progress';

/** `react-native-purchases-ui` is native-only; the web build never sells. */
export async function presentPaywall(_source: PaywallSource): Promise<PaywallOutcome> {
  return 'dismissed';
}

export async function presentPaywallIfNeeded(): Promise<PaywallOutcome> {
  return 'dismissed';
}

export async function presentCustomerCenter(): Promise<void> {}
