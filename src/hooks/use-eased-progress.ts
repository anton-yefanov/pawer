import { useEffect, useRef, useState } from 'react';

const DURATION = 320;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * A 0→1 ramp driven from JS, for values that have to be interpolated in React
 * rather than on the UI thread — an SVG chart's data, where every frame is a
 * fresh set of points and Reanimated has nothing to hand off to.
 *
 * A reversal picks up from wherever the ramp had got to and shortens the
 * remaining time to match, so a double-tap doesn't crawl back.
 */
export function useEasedProgress(on: boolean, duration = DURATION) {
  const [progress, setProgress] = useState(on ? 1 : 0);
  const current = useRef(progress);

  useEffect(() => {
    const to = on ? 1 : 0;
    const from = current.current;
    if (from === to) return;

    const span = duration * Math.abs(to - from);
    const started = Date.now();
    let frame = requestAnimationFrame(function step() {
      const t = Math.min(1, (Date.now() - started) / span);
      current.current = from + (to - from) * ease(t);
      setProgress(current.current);
      if (t < 1) frame = requestAnimationFrame(step);
    });

    return () => cancelAnimationFrame(frame);
  }, [on, duration]);

  return progress;
}
