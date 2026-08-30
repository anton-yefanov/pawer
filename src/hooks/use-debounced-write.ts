import { useEffect, useRef } from 'react';

import { attempt } from '@/lib/observability';

/**
 * Trailing debounce with an explicit flush.
 *
 * Set inputs write through to SQLite as the user types, but every write wakes
 * every live query on the screen. Debouncing keeps that to a couple per second;
 * flushing on blur and on unmount is what stops a half-typed weight from being
 * lost when the user gets a text mid-set (IMPLEMENTATION_PLAN §3.2).
 */
export function useDebouncedWrite<T>(
  write: (value: T) => void | Promise<unknown>,
  delayMs = 400
) {
  // `pending` is guarded by its own key rather than a null check: T itself is
  // nullable here (a cleared weight field writes null) and null is a real value.
  const state = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    pending?: T;
    write: (value: T) => void | Promise<unknown>;
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
      run(state.current.write(value));
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
      // The unmount flush is the one this hook exists for, and it is also the
      // one whose failure is least visible: the screen is already gone.
      if ('pending' in current) run(current.write(current.pending as T));
    };
  }, []);

  return { push, flush };
}

/**
 * The write is what the user typed. Losing it silently is the exact failure the
 * debounce was added to prevent, so a rejection has to be heard about even
 * though there is no longer a screen to say it on.
 */
function run(result: void | Promise<unknown>): void {
  if (result) void attempt('sets', result, undefined, { phase: 'debounced-write' });
}
