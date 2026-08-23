import { newId } from '@/db/id';

/**
 * A superset is nothing but a shared `supersetId` across exercise rows — the
 * workout's and the template's alike. This is the only place that decides what
 * that means: which rows count as a group, what colour index a group gets, and
 * where a joining row lands.
 *
 * A group of one is not a superset. Leaving cleans the leftover up, but a row
 * removed from the workout can strand one, so the derivation drops it too.
 */

export type SupersetRow = {
  id: string;
  supersetId: string | null;
};

/** Row id -> zero-based group index, groups numbered by first appearance. */
export function supersetGroups(rows: readonly SupersetRow[]): Map<string, number> {
  const sizes = new Map<string, number>();
  for (const row of rows) {
    if (row.supersetId === null) continue;
    sizes.set(row.supersetId, (sizes.get(row.supersetId) ?? 0) + 1);
  }

  const indexes = new Map<string, number>();
  const out = new Map<string, number>();
  for (const row of rows) {
    const group = row.supersetId;
    if (group === null || (sizes.get(group) ?? 0) < 2) continue;
    let index = indexes.get(group);
    if (index === undefined) {
      index = indexes.size;
      indexes.set(group, index);
    }
    out.set(row.id, index);
  }
  return out;
}

const membersOf = (rows: readonly SupersetRow[], row: SupersetRow) =>
  row.supersetId === null
    ? [row.id]
    : rows.filter((r) => r.supersetId === row.supersetId).map((r) => r.id);

/**
 * Joining `targetId` to `sourceId`'s superset. The source's group holds its
 * place and the target's — a whole group when the target was already in one —
 * moves in behind it, so a superset always reads as one block.
 */
export function joinPlan(
  rows: readonly SupersetRow[],
  sourceId: string,
  targetId: string
): { supersetId: string; memberIds: string[]; orderedIds: string[] } | null {
  const source = rows.find((row) => row.id === sourceId);
  const target = rows.find((row) => row.id === targetId);
  if (!source || !target || sourceId === targetId) return null;

  const supersetId = source.supersetId ?? target.supersetId ?? newId();
  const anchor = membersOf(rows, source);
  const moving = membersOf(rows, target).filter((id) => !anchor.includes(id));
  if (moving.length === 0) return null;

  const memberIds = [...anchor, ...moving].filter(
    (id) => rows.find((row) => row.id === id)?.supersetId !== supersetId
  );

  const rest = rows.map((row) => row.id).filter((id) => !moving.includes(id));
  const insertAt = rest.findLastIndex((id) => anchor.includes(id)) + 1;
  const orderedIds = [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)];

  return { supersetId, memberIds, orderedIds };
}

/** What one row's Superset submenu offers: every other row bar its own group. */
export function supersetCandidates<T extends SupersetRow & { name: string }>(
  rows: readonly T[],
  row: T
): { id: string; name: string }[] {
  return rows
    .filter(
      (other) =>
        other.id !== row.id &&
        (other.supersetId === null || other.supersetId !== row.supersetId)
    )
    .map(({ id, name }) => ({ id, name }));
}

/** Copying rows into a new workout or template: a group keeps its shape, not its id. */
export function remapSuperset(
  minted: Map<string, string>,
  supersetId: string | null
): string | null {
  if (supersetId === null) return null;
  const existing = minted.get(supersetId);
  if (existing) return existing;
  const fresh = newId();
  minted.set(supersetId, fresh);
  return fresh;
}

/** The rows whose `supersetId` has to be cleared to take `rowId` out of its group. */
export function leavePlan(rows: readonly SupersetRow[], rowId: string): string[] {
  const row = rows.find((r) => r.id === rowId);
  if (!row || row.supersetId === null) return [];

  const rest = rows.filter((r) => r.id !== rowId && r.supersetId === row.supersetId);
  return rest.length === 1 ? [rowId, rest[0].id] : [rowId];
}
