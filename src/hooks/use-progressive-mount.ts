import { useEffect, useState } from 'react';

/**
 * Splits a long list's mount into the part a screen shows at once and the rest.
 *
 * Android presents a `formSheet` only once its content has been laid out, so
 * everything mounted in the opening commit is time the sheet spends offscreen.
 * A workout's exercise cards are expensive enough — a swipeable row per set —
 * that mounting a whole session costs about as long as the animation it is
 * delaying. Returning to the visible ones first puts the rest in a second
 * commit that lands while the sheet is still moving, and one extra commit
 * rather than one per item is what keeps the rows already up from re-rendering
 * their way through the list.
 */
export function useProgressiveMount(total: number, visible: number) {
  const [count, setCount] = useState(visible);

  useEffect(() => {
    if (count >= total) return;
    // Latched past `total` rather than set to it: the wait is what an opening
    // screen needs, and an exercise added later should appear on the spot.
    const task = requestIdleCallback(() => setCount(Number.MAX_SAFE_INTEGER));
    return () => cancelIdleCallback(task);
  }, [count, total]);

  return Math.min(count, total);
}
