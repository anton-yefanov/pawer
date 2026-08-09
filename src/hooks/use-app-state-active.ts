import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Fires on every transition into the foreground. iOS suspends JS a few seconds
 * after backgrounding, so anything time-based has to resync from wall-clock
 * here rather than trusting an interval to have kept running.
 */
export function useAppStateActive(callback: () => void) {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') latest.current();
    });
    return () => sub.remove();
  }, []);
}
