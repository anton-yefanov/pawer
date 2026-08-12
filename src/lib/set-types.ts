import type { ThemeColor } from '@/constants/theme';

/**
 * What a set counts as. Like `TRACKING` in src/lib/tracking-types.ts, this is the
 * only place that switches on the value — letter, colour, numbering and whether
 * the set feeds any metric all read from `SET_TYPES`.
 *
 * A drop set is real work and counts everywhere; only the letter marks it.
 */
export type SetType = 'normal' | 'warmup' | 'drop';

export const SET_TYPES = {
  normal: { label: 'Normal', letter: null, color: 'text', countsWork: true },
  warmup: { label: 'Warm up', letter: 'W', color: 'warmup', countsWork: false },
  drop: { label: 'Drop set', letter: 'D', color: 'drop', countsWork: true },
} as const satisfies Record<
  SetType,
  { label: string; letter: string | null; color: ThemeColor; countsWork: boolean }
>;

export const SET_TYPE_KEYS = Object.keys(SET_TYPES) as SetType[];

export function setTypeOf(value: string | null | undefined): SetType {
  return value != null && value in SET_TYPES ? (value as SetType) : 'normal';
}

export function isWorkSet(set: { setType: string }): boolean {
  return SET_TYPES[setTypeOf(set.setType)].countsWork;
}

/**
 * The Set column, one entry per row: `1, W, 2, D, 3`. Marked sets show their
 * letter instead of a number and don't consume one, so the numbers a lifter reads
 * are their work sets.
 */
export function setLabels(sets: readonly { setType: string }[]): string[] {
  let number = 0;
  return sets.map((set) => {
    const { letter } = SET_TYPES[setTypeOf(set.setType)];
    return letter ?? String(++number);
  });
}
