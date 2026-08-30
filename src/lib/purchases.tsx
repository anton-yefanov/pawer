import Constants from 'expo-constants';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';
import { attempt, guard, guardSync, report } from '@/lib/observability';
import { distinctId, track } from '@/lib/telemetry';

/**
 * The entitlement *identifier* configured in the RevenueCat dashboard, not its
 * display name. Every gate in the app asks about this one string.
 */
export const PRO_ENTITLEMENT = 'pro';

export const PRO_NAME = 'Pawer Pro';

/**
 * The last known entitlement, mirrored into SQLite. The app has to work in a
 * gym basement: the RevenueCat SDK keeps its own cache, but it is empty on a
 * cold start with no signal, and a paying user must not lose Pro because of it.
 */
const PRO_CACHE_KEY = 'pro_entitlement';

const API_KEY = ((Constants.expoConfig?.extra?.revenueCat ?? {}) as Record<string, string>)[
  Platform.OS
];

/**
 * The RevenueCat SDK force-quits the app inside `configure` when a `test_` key
 * is used in a build that isn't debuggable, so a release build on the test key
 * can never launch. Skipping configure keeps it runnable: every `Purchases`
 * call then rejects into the catch it already has and Pro stays locked, which
 * is what makes a local `--variant release` usable for profiling before the
 * production key exists.
 */
const CONFIGURED = Boolean(API_KEY) && (__DEV__ || !API_KEY.startsWith('test_'));

export type RestoreResult =
  | { status: 'restored' }
  | { status: 'nothing' }
  | { status: 'error'; message: string };

type PurchasesValue = {
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  restore: () => Promise<RestoreResult>;
  refresh: () => Promise<void>;
};

const PurchasesContext = createContext<PurchasesValue | null>(null);

export function isProActive(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT] !== undefined;
}

export function PurchasesProvider({ children }: { children: ReactNode }) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [cached, setCached] = useState(false);
  const persisted = useRef<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSetting(db, PRO_CACHE_KEY).then((value) => {
      // A live answer that beat the read here has already rewritten the row.
      if (cancelled || persisted.current !== null) return;
      persisted.current = value === 'true';
      setCached(value === 'true');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!CONFIGURED) {
      console.warn(
        `[purchases] ${API_KEY ? 'test key in a release build' : `no key for ${Platform.OS}`}; ${PRO_NAME} stays locked`
      );
      return;
    }

    const configured = guardSync('purchases', () => {
      void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
      Purchases.configure({ apiKey: API_KEY });

      // The attribute RevenueCat's PostHog integration looks for: it is what
      // lands a renewal on the same person as the `paywall_shown` that sold it.
      const id = distinctId();
      if (id) void Purchases.setAttributes({ $posthogUserId: id });

      Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
      return true;
    });
    if (!configured) return;

    // The listener only fires on *change*, so the state at launch has to be
    // asked for. Offline this rejects and the cached entitlement stands — but a
    // permanently failing SDK silently downgrades a paying user once that cache
    // goes stale, so it is worth hearing about.
    void attempt('purchases', Purchases.getCustomerInfo().then(setCustomerInfo), undefined, {
      phase: 'launch',
    });

    return () => {
      Purchases.removeCustomerInfoUpdateListener(setCustomerInfo);
    };
  }, []);

  const isPro = customerInfo ? isProActive(customerInfo) : cached;

  // Written only on a real change: every write to `settings` wakes the change
  // listener and re-runs every `useLiveQuery` in the app.
  useEffect(() => {
    if (!customerInfo) return;
    const active = isProActive(customerInfo);
    if (active === persisted.current) return;
    persisted.current = active;
    void attempt('purchases', setSetting(db, PRO_CACHE_KEY, String(active)), undefined, {
      phase: 'cache',
    }).then((written) => {
      // A failed write used to leave this ref sure the cache was current, so
      // nothing ever retried and the next offline cold start took Pro away from
      // someone who paid for it. Clearing it makes the next change try again.
      if (!written) persisted.current = null;
    });
  }, [customerInfo]);

  const value: PurchasesValue = {
    isPro,
    customerInfo,
    refresh: async () => {
      const info = await guard('purchases', Purchases.getCustomerInfo(), undefined, {
        phase: 'refresh',
      });
      if (info) setCustomerInfo(info);
    },
    restore: async () => {
      try {
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        const found = isProActive(info);
        track('pro_restored', { found });
        return found ? { status: 'restored' } : { status: 'nothing' };
      } catch (error) {
        report('purchases', error, { phase: 'restore' });
        return { status: 'error', message: messageOf(error) };
      }
    },
  };

  return <PurchasesContext value={value}>{children}</PurchasesContext>;
}

export function usePurchases(): PurchasesValue {
  const value = use(PurchasesContext);
  if (!value) throw new Error('usePurchases must be used inside PurchasesProvider');
  return value;
}

export function usePro(): boolean {
  return use(PurchasesContext)?.isPro ?? false;
}

function messageOf(error: unknown): string {
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return 'Something went wrong. Please try again.';
}
