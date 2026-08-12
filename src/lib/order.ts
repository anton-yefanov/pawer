/** Anything the order doesn't mention keeps its place at the end — a row
 *  created after the last drag has the highest `position` anyway. */
export function sortBy<T extends { id: string }>(items: T[], ids: readonly string[]): T[] {
  if (ids.length === 0) return items;
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function move(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
