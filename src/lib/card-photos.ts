import { type ImageSource } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { newId } from '@/db/id';

/**
 * The cover photos a user picks for their own templates. The only place that
 * builds a path into them, in the same spirit as `exercise-media.ts` — a
 * screen holds a filename and nothing else.
 *
 * A photo is stored already cropped to the cover's aspect and downscaled, so
 * drawing one is a plain `Image` and nothing measures or re-cuts at runtime.
 */

const DIRECTORY = 'covers';
/** Cover aspect, matching `COVER_RATIO` in `grid-card.tsx`. */
const ASPECT = 4 / 3;
/** Twice the widest cover a phone draws, so it stays sharp at 3x. */
const WIDTH = 1200;
const QUALITY = 0.85;

function directory(): Directory {
  const dir = new Directory(Paths.document, DIRECTORY);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function coverPhotoSource(file: string): ImageSource {
  return { uri: new File(Paths.document, DIRECTORY, file).uri };
}

/**
 * Copies a picked photo into the app's own storage as a cover-shaped WebP.
 * `sourceUri` may be a `ph://` asset — the manipulator resolves those itself.
 *
 * The first render is only there for the intrinsic size: a photo library asset
 * carries EXIF orientation, so its stored dimensions are not necessarily the
 * ones the crop rectangle has to be expressed in.
 */
export async function importCoverPhoto(sourceUri: string): Promise<string> {
  const loaded = await ImageManipulator.manipulate(sourceUri).renderAsync();

  const width = Math.min(loaded.width, loaded.height * ASPECT);
  const height = width / ASPECT;
  const rendered = await ImageManipulator.manipulate(loaded)
    .crop({
      originX: (loaded.width - width) / 2,
      originY: (loaded.height - height) / 2,
      width,
      height,
    })
    .resize({ width: Math.min(WIDTH, width) })
    .renderAsync();

  const saved = await rendered.saveAsync({ format: SaveFormat.WEBP, compress: QUALITY });

  // A fresh name every time, never the template's id: `expo-image` caches by
  // uri, so reusing a path would keep drawing the photo it replaced.
  const file = `${newId()}.webp`;
  await new File(saved.uri).move(new File(directory(), file));
  return file;
}

/** A duplicated template gets its own copy — two rows never share one file. */
export async function copyCoverPhoto(file: string): Promise<string | null> {
  const source = new File(Paths.document, DIRECTORY, file);
  if (!source.exists) return null;

  const copy = `${newId()}.webp`;
  await source.copy(new File(directory(), copy));
  return copy;
}

/** Never throws: cleanup runs on paths that may already be gone. */
export function deleteCoverPhoto(file: string | null | undefined): void {
  if (!file) return;
  try {
    const target = new File(Paths.document, DIRECTORY, file);
    if (target.exists) target.delete();
  } catch {
    // A cover that outlives its row costs a few hundred kilobytes; a throw here
    // would take down the sheet that was only tidying up after itself.
  }
}
