import { report } from '@/lib/observability';

/**
 * What a template or folder card draws over its mesh gradient, stored as JSON in
 * `templates.artwork` and `folders.artwork`. This module is the only thing that
 * reads or writes those columns — a screen never sees the raw string.
 *
 * The value is a discriminated union rather than a bare id so pre-defined
 * stickers can join emoji later without another migration. `null` is the bare
 * gradient, which is also what Clear produces.
 *
 * `exercises` carries nothing: the cover reads the template's own exercises, so
 * it stays right as they are added and reordered. A folder wears emoji or
 * nothing — it has neither exercises nor a photo.
 *
 * A photo artwork holds a bare filename, never a uri: iOS rewrites the app
 * container's path on every reinstall, so a stored absolute path goes stale.
 * `src/lib/card-photos.ts` is what turns one back into a file.
 */

export const MAX_EMOJI = 3;

export type CardArtwork =
  | { kind: 'exercises' }
  | { kind: 'emoji'; emojis: readonly string[] }
  | { kind: 'photo'; file: string };

/** One shared identity, so an untouched cover never rebuilds its artwork. */
export const EXERCISES_ARTWORK: CardArtwork = Object.freeze({ kind: 'exercises' });

/** Anything unrecognised reads as the bare gradient, so a value written by a
 *  later build never breaks an older one. */
export function asCardArtwork(value: string | null | undefined): CardArtwork | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { kind, emojis, file } = parsed as { kind?: unknown; emojis?: unknown; file?: unknown };
    if (kind === 'exercises') return EXERCISES_ARTWORK;
    if (kind === 'photo') return typeof file === 'string' ? photoArtwork(file) : null;
    if (kind !== 'emoji' || !Array.isArray(emojis)) return null;
    return emojiArtwork(emojis.filter((entry) => typeof entry === 'string'));
  } catch (error) {
    report('templates', error, { phase: 'artwork-parse' });
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

export function photoArtwork(file: string | null | undefined): CardArtwork | null {
  return file ? { kind: 'photo', file } : null;
}

export function artworkPhotoFile(artwork: CardArtwork | null): string | null {
  return artwork?.kind === 'photo' ? artwork.file : null;
}
