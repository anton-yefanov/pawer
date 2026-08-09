import { useEffect, useRef } from 'react';

/**
 * Trailing debounce with an explicit flush.
 *
 * Set inputs write through to SQLite as the user types, but every write wakes
 * every live query on the screen. Debouncing keeps that to a couple per second;
 * flushing on blur and on unmount is what stops a half-typed weight from being
 * lost when the user gets a text mid-set (IMPLEMENTATION_PLAN §3.2).
 */
export function useDebouncedWrite<T>(write: (value: T) => void, delayMs = 400) {
  // `pending` is guarded by its own key rather than a null check: T itself is
  // nullable here (a cleared weight field writes null) and null is a real value.
  const state = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    pending?: T;
    write: (value: T) => void;
  }>({ timer: null, write });

  useEffect(() => {
    state.current.write = write;
  });

  const flush = () => {
    if (state.current.timer) {
      clearTimeout(state.current.timer);
      state.current.timer = null;
    }
    if ('pending' in state.current) {
      const value = state.current.pending as T;
      delete state.current.pending;
      state.current.write(value);
    }
  };

  const push = (value: T) => {
    state.current.pending = value;
    if (state.current.timer) clearTimeout(state.current.timer);
    state.current.timer = setTimeout(flush, delayMs);
  };

  useEffect(() => {
    const current = state.current;
    return () => {
      if (current.timer) clearTimeout(current.timer);
      if ('pending' in current) current.write(current.pending as T);
    };
  }, []);

  return { push, flush };
}
