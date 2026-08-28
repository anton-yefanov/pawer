import { comparisonLabel, delta, type Delta } from '@/lib/analytics-compare';
import type { DateRange } from '@/lib/analytics-period';
import type { AnalyticsTotals } from '@/lib/analytics-queries';
import { distanceUnitFor, formatDistance, formatTonnage, type WeightUnit } from '@/lib/units';
import { formatHoursMinutes } from '@/lib/workout-stats';

/** A run of prose; `bold` marks the numeric measures the card sets apart. */
export type Segment = { text: string; bold?: true };

export type QuickSummary =
  | { kind: 'insights'; segments: readonly Segment[] }
  | { kind: 'placeholder'; lines: readonly string[] };

type Input = {
  totals: AnalyticsTotals;
  past: AnalyticsTotals;
  comparable: boolean;
  range: DateRange;
  unit: WeightUnit;
};

/**
 * Clauses sharing a group describe the same thing twice — sets and reps move
 * together, so a paragraph that mentions both spends its second slot saying
 * nothing new. Only the strongest member of a group survives.
 */
type Group = 'work' | 'time' | 'records' | 'distance';

/** A verb phrase that slots after "You " or "You also ", ranked by `weight`. */
type Clause = {
  group: Group;
  weight: number;
  direction: Delta['direction'];
  segments: Segment[];
};

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

const value = (text: string): Segment => ({ text, bold: true });

/** "once" reads where "1 times" does not. */
function times(count: number): Segment[] {
  return count === 1 ? [value('once')] : [value(String(count)), { text: ' times' }];
}

/**
 * A percentage is only worth a clause when it moved. `flat` is dropped rather
 * than rendered as "no change", which would lead a paragraph with a non-event —
 * unless nothing else survives, which the average-duration fallback covers.
 */
function moved(current: Delta | null | undefined): Delta | null {
  return current && current.direction !== 'flat' ? current : null;
}

/**
 * Past a few multiples a percentage stops being readable — a first real month
 * against a single trial session is a four-figure gain — so it becomes "5×".
 */
function formatPercent(percent: number): string {
  return percent >= 400 ? `${Math.round(percent / 100)}×` : `${percent}%`;
}

/** Counts read better as "31 more sets" than as a percentage of themselves. */
function countClause(
  group: Group,
  current: number,
  previous: number,
  verbs: { up: string; down: string },
  nouns: { one: string; many: string },
  weightScale = 1
): Clause | null {
  const change = moved(delta(current, previous));
  if (!change) return null;

  const difference = Math.abs(current - previous);
  if (difference === 0) return null;

  const up = change.direction === 'up';
  return {
    group,
    weight: change.percent * weightScale,
    direction: change.direction,
    segments: [
      { text: `${up ? verbs.up : verbs.down} ` },
      value(String(difference)),
      { text: ` ${up ? 'more' : 'fewer'} ${plural(difference, nouns.one, nouns.many)}` },
    ],
  };
}

/** Tonnage, time and distance read better as a proportion than as a difference. */
function percentClause(
  group: Group,
  current: number,
  previous: number,
  before: string,
  after: string
): Clause | null {
  const change = moved(delta(current, previous));
  if (!change) return null;

  return {
    group,
    weight: change.percent,
    direction: change.direction,
    segments: [
      { text: `${before} ` },
      value(formatPercent(change.percent)),
      { text: ` ${change.direction === 'up' ? 'more' : 'less'} ${after}` },
    ],
  };
}

/** Low enough to lose to any real movement; only surfaces when nothing moved. */
const FALLBACK_WEIGHT = 1;

/** How many clauses the support sentence carries, records included. */
const SUPPORT_SLOTS = 2;

/**
 * Never reported as a miss: a period without records is the normal case, and
 * "you set 3 fewer records" is a sentence no user needs to read.
 */
function recordsClause({ totals }: Input): Clause | null {
  if (totals.records === 0) return null;

  return {
    group: 'records',
    weight: 0,
    direction: 'up',
    segments: [
      { text: 'set ' },
      value(String(totals.records)),
      { text: ` new personal ${plural(totals.records, 'record', 'records')}` },
    ],
  };
}

function supportClauses(input: Input): Clause[] {
  const { totals, past, unit } = input;

  const candidates: (Clause | null)[] = [
    countClause(
      'work',
      totals.completedSets,
      past.completedSets,
      { up: 'pushed through', down: 'logged' },
      { one: 'set', many: 'sets' }
    ),
    countClause(
      'work',
      totals.reps,
      past.reps,
      { up: 'racked up', down: 'logged' },
      { one: 'rep', many: 'reps' }
    ),
    countClause(
      'work',
      totals.exerciseEntries,
      past.exerciseEntries,
      { up: 'worked through', down: 'worked through' },
      { one: 'exercise', many: 'exercises' },
      // Discounted so it loses the `work` group to sets or reps whenever those
      // moved comparably — it is the least telling of the three.
      0.8
    ),
    percentClause('time', totals.durationMs, past.durationMs, 'spent', 'time in the gym'),

    // Zero for everyone who only lifts, so it earns a clause only once there is
    // distance on either side of the comparison to talk about.
    totals.distanceM > 0 || past.distanceM > 0
      ? (percentClause('distance', totals.distanceM, past.distanceM, 'covered', 'distance') ?? {
          group: 'distance',
          weight: FALLBACK_WEIGHT,
          direction: 'flat',
          segments: [
            { text: 'covered ' },
            value(formatDistance(totals.distanceM, distanceUnitFor(unit))),
          ],
        })
      : null,
  ];

  const strongest = new Map<Group, Clause>();
  for (const clause of candidates) {
    if (!clause) continue;
    const held = strongest.get(clause.group);
    if (!held || clause.weight > held.weight) strongest.set(clause.group, clause);
  }

  // A record leads the sentence outright rather than competing for a slot: it is
  // always the most interesting thing on the screen, and against a thin previous
  // period the percentages run high enough to crowd it out of any ranking.
  const records = recordsClause(input);
  const ranked = [...strongest.values()];

  // Something true to say about a period where every metric held steady, which
  // is otherwise an anchor sentence on its own.
  if (!records && ranked.length === 0 && totals.avgDurationMs > 0) {
    ranked.push({
      group: 'time',
      weight: FALLBACK_WEIGHT,
      direction: 'flat',
      segments: [
        { text: 'averaged ' },
        value(formatHoursMinutes(totals.avgDurationMs)),
        { text: ' a session' },
      ],
    });
  }

  const rest = ranked.sort((a, b) => b.weight - a.weight);
  return records
    ? [records, ...rest.slice(0, SUPPORT_SLOTS - 1)]
    : rest.slice(0, SUPPORT_SLOTS);
}

/**
 * The workout count is the one fact every period has, so it always opens.
 * Tonnage joins it when there is a proportion to quote, and falls back to a
 * bare total for someone whose training carries no weight at all.
 */
function anchor({ totals, past, range, unit }: Input): Segment[] {
  const tonnage = moved(delta(totals.volumeKg, past.volumeKg));

  if (tonnage) {
    return [
      { text: 'You trained ' },
      ...times(totals.workouts),
      { text: ' and lifted ' },
      value(formatPercent(tonnage.percent)),
      {
        text: ` ${tonnage.direction === 'up' ? 'more' : 'less'} weight than the ${comparisonLabel(range)}.`,
      },
    ];
  }

  // Someone whose training carries no weight — a runner, or bodyweight only —
  // still needs the opening to say what the period is being measured against,
  // so the session count takes over as the comparison the sentence draws.
  const sessions = moved(delta(totals.workouts, past.workouts));
  if (sessions) {
    return [
      { text: 'You trained ' },
      ...times(totals.workouts),
      { text: `, ${sessions.direction === 'up' ? 'up' : 'down'} from ` },
      value(String(past.workouts)),
      { text: ` in the ${comparisonLabel(range)}.` },
    ];
  }

  if (totals.volumeKg > 0) {
    return [
      { text: 'You trained ' },
      ...times(totals.workouts),
      { text: ' over this period, for ' },
      value(formatTonnage(totals.volumeKg, unit)),
      { text: ' in total.' },
    ];
  }

  return [{ text: 'You trained ' }, ...times(totals.workouts), { text: ' over this period.' }];
}

/**
 * Tone, not data. A lighter period is usually a deliberate one — the delta
 * arrows in src/components/analytics/stat-rows.tsx are deliberately colourless
 * for the same reason — so there is no variant that reads as failure. The mixed
 * case exists so a paragraph reporting more sets against less tonnage doesn't
 * congratulate the user on a story it just told two ways.
 */
function closing({ totals, past }: Input): string {
  const signals = [
    delta(totals.volumeKg, past.volumeKg),
    delta(totals.completedSets, past.completedSets),
    delta(totals.durationMs, past.durationMs),
    delta(totals.records, past.records),
  ];

  const up = signals.filter((signal) => signal?.direction === 'up').length;
  const down = signals.filter((signal) => signal?.direction === 'down').length;

  // Any genuine split goes to the mixed line regardless of which side has more
  // signals: a paragraph that has just said "lifted 7% less weight" cannot sign
  // off with "keep up the great work" only because two lesser metrics rose.
  if (up > 0 && down > 0) return 'a different shape of work, but the work got done.';
  if (up > 0) return 'keep up the great work!';
  if (down > 0) return 'a lighter block, and consistency is what compounds.';
  // No internal dash: the closing is already joined to the paragraph with one.
  return 'steady, and holding steady is the hard part.';
}

export function buildQuickSummary(input: Input): QuickSummary {
  if (input.totals.workouts === 0) {
    return {
      kind: 'placeholder',
      lines: [
        'No workouts logged in this period.',
        'Pick a wider period, or log a session to see how it compares.',
      ],
    };
  }

  if (!input.comparable) {
    return {
      kind: 'placeholder',
      lines: [
        'Log a few more workouts to unlock insights.',
        'Once there is a period behind this one to compare, your summary shows up here.',
      ],
    };
  }

  const support = supportClauses(input);
  const segments = [...anchor(input)];

  if (support.length > 0) {
    segments.push({ text: ' You also ' });
    support.forEach((clause, index) => {
      if (index > 0) {
        // "more sets but less time" — an honest mixed story needs the adversative,
        // or the sentence reads as if both halves point the same way.
        const previous = support[index - 1];
        const opposed =
          previous.direction !== 'flat' &&
          clause.direction !== 'flat' &&
          previous.direction !== clause.direction;
        segments.push({ text: opposed ? ' but ' : ' and ' });
      }
      segments.push(...clause.segments);
    });
  }

  segments.push({ text: ` — ${closing(input)}` });

  return { kind: 'insights', segments };
}
