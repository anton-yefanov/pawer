/**
 * What a template card draws over its mesh gradient, stored as JSON in
 * `templates.artwork`. This module is the only thing that reads or writes that
 * column — a screen never sees the raw string.
 *
 * The value is a discriminated union rather than a bare id so pre-defined
 * stickers can join emoji later without another migration. `null` is the bare
 * gradient, which is also what Clear produces.
 */

export const MAX_EMOJI = 3;

export type CardArtwork = { kind: 'emoji'; emojis: readonly string[] };

/** Anything unrecognised reads as the bare gradient, so a value written by a
 *  later build never breaks an older one. */
export function asCardArtwork(value: string | null | undefined): CardArtwork | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { kind, emojis } = parsed as { kind?: unknown; emojis?: unknown };
    if (kind !== 'emoji' || !Array.isArray(emojis)) return null;
    return emojiArtwork(emojis.filter((entry) => typeof entry === 'string'));
  } catch {
    return null;
  }
}

export function serializeArtwork(artwork: CardArtwork | null): string | null {
  return artwork && JSON.stringify(artwork);
}

/** Empty is not an artwork — it collapses to `null` so there is one empty state. */
export function emojiArtwork(emojis: readonly string[]): CardArtwork | null {
  const kept = emojis.filter(Boolean).slice(0, MAX_EMOJI);
  return kept.length > 0 ? { kind: 'emoji', emojis: kept } : null;
}
