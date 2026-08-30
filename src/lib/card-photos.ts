import { type ImageSource } from 'expo-image';

import { COVER_ASPECT } from '@/components/templates/grid-card';
import { photoStore } from '@/lib/photo-store';

/** The cover photos a user picks for their own templates. */
const covers = photoStore({
  directory: 'covers',
  aspect: COVER_ASPECT,
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
