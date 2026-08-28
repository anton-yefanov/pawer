import { type ImageSource } from 'expo-image';

import { photoStore } from '@/lib/photo-store';

/** The cover photos a user picks for their own templates. */
const covers = photoStore({
  directory: 'covers',
  /** Cover aspect, matching `COVER_RATIO` in `grid-card.tsx`. */
  aspect: 4 / 3,
  width: 1200,
});

export function coverPhotoSource(file: string): ImageSource {
  return covers.source(file);
}

export function importCoverPhoto(sourceUri: string): Promise<string> {
  return covers.import(sourceUri);
}

export function copyCoverPhoto(file: string): Promise<string | null> {
  return covers.copy(file);
}

export function deleteCoverPhoto(file: string | null | undefined): void {
  covers.delete(file);
}
