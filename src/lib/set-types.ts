import { t } from '@/i18n';
import type { ThemeColor } from '@/constants/theme';

/**
 * What a set counts as. Like `TRACKING` in src/lib/tracking-types.ts, this is the
 * only place that switches on the value — letter, colour, numbering and whether
 * the set feeds any metric all read from `SET_TYPES`. `countsWork` is the
 * default answer, not the final one: the Include Warmup in Stats preference can
 * pull warm-ups back into every aggregate, which is why `isWorkSet` asks for it.
 *
 * A drop set is real work and counts everywhere; only the letter marks it.
 */
export type SetType = 'normal' | 'warmup' | 'drop';

export const SET_TYPES = {
  normal: {
    get label() {
      return t('workout:setType.normal');
    },
    letter: null,
    color: 'text',
    countsWork: true,
  },
  warmup: {
    get label() {
      return t('workout:setType.warmup');
    },
    get letter() {
      return t('workout:setType.warmupLetter');
    },
    color: 'warmup',
    countsWork: false,
  },
  drop: {
    get label() {
      return t('workout:setType.drop');
    },
    get letter() {
      return t('workout:setType.dropLetter');
    },
    color: 'drop',
    countsWork: true,
  },
} as const satisfies Record<
  SetType,
  { label: string; letter: string | null; color: ThemeColor; countsWork: boolean }
>;

export const SET_TYPE_KEYS = Object.keys(SET_TYPES) as SetType[];

export function setTypeOf(value: string | null | undefined): SetType {
  return value != null && value in SET_TYPES ? (value as SetType) : 'normal';
}

export function isWorkSet(set: { setType: string }, includeWarmup: boolean): boolean {
  return includeWarmup || SET_TYPES[setTypeOf(set.setType)].countsWork;
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
