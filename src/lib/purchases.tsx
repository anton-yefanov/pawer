import Constants from 'expo-constants';
import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';

import { db } from '@/db/client';
import { getSetting, setSetting } from '@/db/seed';

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
    if (!API_KEY) {
      console.warn(`[purchases] no RevenueCat key for ${Platform.OS}; ${PRO_NAME} stays locked`);
      return;
    }

    void Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
    Purchases.configure({ apiKey: API_KEY });

    Purchases.addCustomerInfoUpdateListener(setCustomerInfo);
    // The listener only fires on *change*, so the state at launch has to be
    // asked for. Offline this rejects and the cached entitlement stands.
    Purchases.getCustomerInfo()
      .then(setCustomerInfo)
      .catch((error: unknown) => console.warn('[purchases] getCustomerInfo failed', error));

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
    void setSetting(db, PRO_CACHE_KEY, String(active));
  }, [customerInfo]);

  const value: PurchasesValue = {
    isPro,
    customerInfo,
    refresh: async () => {
      try {
        setCustomerInfo(await Purchases.getCustomerInfo());
      } catch (error) {
        console.warn('[purchases] refresh failed', error);
      }
    },
    restore: async () => {
      try {
        const info = await Purchases.restorePurchases();
        setCustomerInfo(info);
        return isProActive(info) ? { status: 'restored' } : { status: 'nothing' };
      } catch (error) {
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
