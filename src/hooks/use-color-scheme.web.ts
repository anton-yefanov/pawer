import { useSyncExternalStore } from 'react';

import { useResolvedColorScheme } from '@/lib/theme-preference';

const subscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const colorScheme = useResolvedColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
