import { type ImageSource } from 'expo-image';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { newId } from '@/db/id';

/**
 * A folder of photos the user picked, in the same spirit as `exercise-media.ts`
 * — a screen holds a filename and nothing else, and this is the only place that
 * builds a path into one.
 *
 * A photo is stored already cropped to the aspect it will be drawn at and
 * downscaled, so drawing one is a plain `Image` and nothing measures or re-cuts
 * at runtime.
 */

type PhotoStoreOptions = {
  /** Under `Paths.document`. */
  directory: string;
  /** Width over height, the shape a photo is cropped to on the way in. */
  aspect: number;
  /** Twice the widest a phone draws it, so it stays sharp at 3x. */
  width: number;
  quality?: number;
};

export type PhotoStore = {
  source(file: string): ImageSource;
  import(sourceUri: string): Promise<string>;
  copy(file: string): Promise<string | null>;
  delete(file: string | null | undefined): void;
};

export function photoStore({
  directory: name,
  aspect,
  width: maxWidth,
  quality = 0.85,
}: PhotoStoreOptions): PhotoStore {
  const directory = (): Directory => {
    const dir = new Directory(Paths.document, name);
    dir.create({ intermediates: true, idempotent: true });
    return dir;
  };

  return {
    source(file) {
      return { uri: new File(Paths.document, name, file).uri };
    },

    /**
     * Copies a picked photo into the app's own storage as a WebP of this shape.
     * `sourceUri` may be a `ph://` asset — the manipulator resolves those itself.
     *
     * The first render is only there for the intrinsic size: a photo library
     * asset carries EXIF orientation, so its stored dimensions are not
     * necessarily the ones the crop rectangle has to be expressed in.
     */
    async import(sourceUri) {
      const loaded = await ImageManipulator.manipulate(sourceUri).renderAsync();

      const width = Math.min(loaded.width, loaded.height * aspect);
      const height = width / aspect;
      const rendered = await ImageManipulator.manipulate(loaded)
        .crop({
          originX: (loaded.width - width) / 2,
          originY: (loaded.height - height) / 2,
          width,
          height,
        })
        .resize({ width: Math.min(maxWidth, width) })
        .renderAsync();

      const saved = await rendered.saveAsync({ format: SaveFormat.WEBP, compress: quality });

      // A fresh name every time, never the row's id: `expo-image` caches by uri,
      // so reusing a path would keep drawing the photo it replaced.
      const file = `${newId()}.webp`;
      await new File(saved.uri).move(new File(directory(), file));
      return file;
    },

    /** A duplicated row gets its own copy — two rows never share one file. */
    async copy(file) {
      const source = new File(Paths.document, name, file);
      if (!source.exists) return null;

      const copy = `${newId()}.webp`;
      await source.copy(new File(directory(), copy));
      return copy;
    },

    /** Never throws: cleanup runs on paths that may already be gone. */
    delete(file) {
      if (!file) return;
      try {
        const target = new File(Paths.document, name, file);
        if (target.exists) target.delete();
      } catch {
        // A photo that outlives its row costs a few hundred kilobytes; a throw
        // here would take down the sheet that was only tidying up after itself.
      }
    },
  };
}
