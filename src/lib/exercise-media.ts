import type { ImageSource } from "expo-image";

import { exercisePhotoSource } from "@/lib/exercise-photos";
import { EXERCISE_MEDIA } from "@/lib/exercise-media-map";
import { report } from "@/lib/observability";

/**
 * What an exercise is drawn from: the seeded clip and its stills, keyed by
 * `sourceId`, or the photo a user picked for their own exercise, which is the
 * only art a custom row ever has.
 */
export type ExerciseArt = { sourceId: string | null; imageFile: string | null };

/** Exercise art is a rounded square wherever it is drawn, as a fraction of its side. */
export const ART_CORNER_SCALE = 0.24;

/**
 * Every seeded `sourceId` has an entry today, but nothing enforces it: bumping
 * `SEED_VERSION` with new exercises and forgetting `npm run build:images` ships
 * blank circles that look exactly like a slow load. Reported once per id so a
 * scrolling library can't flood the quota.
 */
const missing = new Set<string>();

function entry(sourceId: string) {
  const found = EXERCISE_MEDIA[sourceId];
  if (!found && !missing.has(sourceId)) {
    missing.add(sourceId);
    report("media", new Error(`No bundled media for exercise ${sourceId}`));
  }
  return found;
}

/** 150px square, centre-cropped, for the 48pt circle in a list row. */
export function exerciseThumbnail({
  sourceId,
  imageFile,
}: ExerciseArt): ImageSource | null {
  if (imageFile) return exercisePhotoSource(imageFile);
  return sourceId === null ? null : (entry(sourceId)?.thumb ?? null);
}

/** The clip's first frame, drawn under it until it has one of its own. */
export function exercisePoster({
  sourceId,
  imageFile,
}: ExerciseArt): ImageSource | null {
  if (imageFile) return exercisePhotoSource(imageFile);
  return sourceId === null ? null : (entry(sourceId)?.poster ?? null);
}

/** The bundled demo clip. Null only for a user's own exercise. */
export function exerciseVideo(sourceId: string | null): number | null {
  return sourceId === null ? null : (entry(sourceId)?.video ?? null);
}

/** For the `onError` of anything drawing one of the sources above. */
export function reportMissingArt(
  art: ExerciseArt,
  error: { error?: string },
): void {
  report("media", new Error(error.error || "Image failed to load"), {
    sourceId: art.sourceId ?? "custom",
    kind: art.imageFile ? "photo" : "bundled",
  });
}
