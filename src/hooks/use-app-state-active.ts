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

/**
 * The mirror image, for work that has to happen before iOS suspends JS.
 * Deliberately not `inactive` — that also fires for a control-centre pull or an
 * incoming call banner, neither of which means the user has left.
 */
export function useAppStateBackground(callback: () => void) {
  const latest = useRef(callback);

  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') latest.current();
    });
    return () => sub.remove();
  }, []);
}
