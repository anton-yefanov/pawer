import { startOfDay, type DateRange } from '@/lib/analytics-period';

export type Bucket = 'day' | 'week' | 'month';

/** Half-open `[start, end)`, epoch ms, snapped to local boundaries. */
export type SeriesPoint = { start: number; end: number; value: number };

export type Series = { bucket: Bucket; label: string; points: SeriesPoint[] };

const DAY_MS = 86_400_000;

const BUCKET_LABELS: Record<Bucket, string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
};

function bucketFor(spanMs: number): Bucket {
  if (spanMs <= 60 * DAY_MS) return 'day';
  if (spanMs <= 550 * DAY_MS) return 'week';
  return 'month';
}

function bucketStart(at: number, bucket: Bucket): number {
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  if (bucket === 'week') {
    // ISO weeks: Monday first, so Sunday (0) walks back six days, not none.
    day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  }
  if (bucket === 'month') day.setDate(1);
  return day.getTime();
}

function nextBucket(start: number, bucket: Bucket): number {
  const day = new Date(start);
  if (bucket === 'day') day.setDate(day.getDate() + 1);
  if (bucket === 'week') day.setDate(day.getDate() + 7);
  if (bucket === 'month') day.setMonth(day.getMonth() + 1);
  return day.getTime();
}

/**
 * Every bucket in the range is emitted, zeros included — a rest week has to
 * occupy x-space or the axis stops being time-proportional.
 *
 * The start is clamped to the first workout because "All time" ranges from
 * epoch 0, which would otherwise mean hundreds of empty months back to 1970.
 */
export function buildSeries<T extends { startedAt: number }>(
  rows: readonly T[],
  range: DateRange,
  pick: (row: T) => number
): Series {
  const first = rows[0];
  if (!first) return { bucket: 'day', label: BUCKET_LABELS.day, points: [] };

  const from = Math.max(range.from, startOfDay(new Date(first.startedAt)));
  const bucket = bucketFor(range.to - from);
  const label = BUCKET_LABELS[bucket];

  const points: SeriesPoint[] = [];
  for (let start = bucketStart(from, bucket); start < range.to; ) {
    const end = nextBucket(start, bucket);
    points.push({ start, end, value: 0 });
    start = end;
  }

  // `rows` can be a render behind `range` — useLiveQuery keeps the previous
  // result until the new query resolves — so a row may sit outside the buckets.
  if (points.length === 0) return { bucket, label, points };

  let index = 0;
  for (const row of rows) {
    if (row.startedAt < points[0].start || row.startedAt >= range.to) continue;
    while (index < points.length - 1 && row.startedAt >= points[index].end) index += 1;
    points[index].value += pick(row);
  }

  return { bucket, label, points };
}

export function formatBucketRange(point: SeriesPoint, bucket: Bucket): string {
  const start = new Date(point.start);

  if (bucket === 'month') {
    return start.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
  if (bucket === 'day') {
    return start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  const last = new Date(point.end - DAY_MS);
  const sameMonth = start.getMonth() === last.getMonth();
  const firstLabel = start.toLocaleDateString(
    undefined,
    sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' }
  );
  const lastLabel = last.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${firstLabel} – ${lastLabel}`;
}
