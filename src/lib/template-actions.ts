import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { type CardColor } from '@/constants/card-colors';
import { db } from '@/db/client';
import { newId } from '@/db/id';
import {
  sets,
  templateExercises,
  templates,
  templateSets,
  workoutExercises,
  workouts,
} from '@/db/schema';
import {
  artworkPhotoFile,
  asCardArtwork,
  type CardArtwork,
  EXERCISES_ARTWORK,
  photoArtwork,
  serializeArtwork,
} from '@/lib/card-artwork';
import { copyCoverPhoto, deleteCoverPhoto } from '@/lib/card-photos';
import { type SetType } from '@/lib/set-types';
import { remapSuperset } from '@/lib/supersets';
import { span } from '@/lib/observability';
import { track } from '@/lib/telemetry';
import { type TrackedSet } from '@/lib/tracking-types';
import { activeWorkoutId, type StartWorkoutResult } from '@/lib/workout-actions';

/** What the editor hands back on Save. Ids are minted client-side and reused as row ids. */
export type TemplateSetInput = TrackedSet & {
  id: string;
  setType: SetType;
  notes: string | null;
};

export type TemplateExerciseInput = {
  id: string;
  exerciseId: string;
  restSeconds: number | null;
  notes: string | null;
  supersetId: string | null;
  sets: readonly TemplateSetInput[];
};

const touch = () => ({ updatedAt: Date.now() });

/** A new cover shows what is in the template, and keeps up as that changes. */
const DEFAULT_ARTWORK = serializeArtwork(EXERCISES_ARTWORK);

function setValues(set: TemplateSetInput, templateExerciseId: string, position: number) {
  return {
    id: set.id,
    templateExerciseId,
    position,
    weightKg: set.weightKg,
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    distanceM: set.distanceM,
    setType: set.setType,
    notes: set.notes,
  };
}

async function nextPersonalPosition(): Promise<number> {
  const last = await db
    .select({ position: templates.position })
    .from(templates)
    .where(and(eq(templates.isBuiltIn, false), isNull(templates.deletedAt)))
    .orderBy(desc(templates.position))
    .limit(1)
    .get();
  return (last?.position ?? -1) + 1;
}

export async function createTemplate({
  name,
  exercises,
}: {
  name: string;
  exercises: readonly TemplateExerciseInput[];
}): Promise<string> {
  const id = newId();
  await db.insert(templates).values({
    id,
    name,
    position: await nextPersonalPosition(),
    isBuiltIn: false,
    artwork: DEFAULT_ARTWORK,
  });

  if (exercises.length > 0) {
    await db.insert(templateExercises).values(
      exercises.map((row, position) => ({
        id: row.id,
        templateId: id,
        exerciseId: row.exerciseId,
        position,
        notes: row.notes,
        restSeconds: row.restSeconds,
        supersetId: row.supersetId,
      })),
    );

    const planned = exercises.flatMap((row) =>
      row.sets.map((set, position) => setValues(set, row.id, position)),
    );
    if (planned.length > 0) await db.insert(templateSets).values(planned);
  }

  track('template_created', { source: 'blank', exercise_count: exercises.length });
  return id;
}

/** The plan is what the user actually logged, warm-ups and all — set types are first class. */
export async function createTemplateFromWorkout(workoutId: string): Promise<string> {
  const workout = await db
    .select({ name: workouts.name })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .get();

  const rows = await db
    .select({
      id: workoutExercises.id,
      exerciseId: workoutExercises.exerciseId,
      notes: workoutExercises.notes,
      restSeconds: workoutExercises.restSeconds,
      supersetId: workoutExercises.supersetId,
    })
    .from(workoutExercises)
    .where(and(eq(workoutExercises.workoutId, workoutId), isNull(workoutExercises.deletedAt)))
    .orderBy(asc(workoutExercises.position))
    .all();

  const logged = await db
    .select({
      workoutExerciseId: sets.workoutExerciseId,
      weightKg: sets.weightKg,
      reps: sets.reps,
      durationSeconds: sets.durationSeconds,
      distanceM: sets.distanceM,
      setType: sets.setType,
    })
    .from(sets)
    .innerJoin(workoutExercises, eq(sets.workoutExerciseId, workoutExercises.id))
    .where(
      and(
        eq(workoutExercises.workoutId, workoutId),
        isNull(workoutExercises.deletedAt),
        isNull(sets.deletedAt),
        eq(sets.completed, true),
      ),
    )
    .orderBy(asc(sets.position))
    .all();

  const id = newId();
  await db.insert(templates).values({
    id,
    name: workout?.name?.trim() || 'Workout',
    position: await nextPersonalPosition(),
    isBuiltIn: false,
    artwork: DEFAULT_ARTWORK,
  });

  if (rows.length > 0) {
    const ids = new Map(rows.map((row) => [row.id, newId()]));
    const supersetIds = new Map<string, string>();

    await db.insert(templateExercises).values(
      rows.map((row, position) => ({
        id: ids.get(row.id)!,
        templateId: id,
        exerciseId: row.exerciseId,
        position,
        notes: row.notes,
        restSeconds: row.restSeconds,
        supersetId: remapSuperset(supersetIds, row.supersetId),
      })),
    );

    const planned = rows.flatMap((row) => {
      const templateExerciseId = ids.get(row.id)!;
      const own = logged.filter((set) => set.workoutExerciseId === row.id);
      // An exercise the user opened but never completed a set of still deserves a row.
      if (own.length === 0) return [{ id: newId(), templateExerciseId, position: 0 }];
      return own.map((set, position) => ({
        id: newId(),
        templateExerciseId,
        position,
        weightKg: set.weightKg,
        reps: set.reps,
        durationSeconds: set.durationSeconds,
        distanceM: set.distanceM,
        setType: set.setType,
      }));
    });
    await db.insert(templateSets).values(planned);
  }

  track('template_created', { source: 'from_workout', exercise_count: rows.length });
  return id;
}

/**
 * Reconciles by row id rather than replacing, so a row the user kept keeps its
 * identity — which is also what lets the same exercise appear twice.
 */
export async function updateTemplate({
  id,
  name,
  exercises,
}: {
  id: string;
  name: string;
  exercises: readonly TemplateExerciseInput[];
}): Promise<void> {
  return span('templates', 'template.update', async () => {
    const now = Date.now();
    await db.update(templates).set({ name, updatedAt: now }).where(eq(templates.id, id));

    const existingExercises = await db
      .select({ id: templateExercises.id })
      .from(templateExercises)
      .where(and(eq(templateExercises.templateId, id), isNull(templateExercises.deletedAt)))
      .all();

    const existingSets = await db
      .select({ id: templateSets.id })
      .from(templateSets)
      .innerJoin(templateExercises, eq(templateSets.templateExerciseId, templateExercises.id))
      .where(and(eq(templateExercises.templateId, id), isNull(templateSets.deletedAt)))
      .all();

    const keptExercises = new Set(exercises.map((row) => row.id));
    const keptSets = new Set(exercises.flatMap((row) => row.sets.map((set) => set.id)));

    const goneExercises = existingExercises
      .map((row) => row.id)
      .filter((rowId) => !keptExercises.has(rowId));
    if (goneExercises.length > 0) {
      await db
        .update(templateExercises)
        .set({ deletedAt: now, updatedAt: now })
        .where(inArray(templateExercises.id, goneExercises));
    }

    const goneSets = existingSets.map((row) => row.id).filter((setId) => !keptSets.has(setId));
    if (goneSets.length > 0) {
      await db
        .update(templateSets)
        .set({ deletedAt: now, updatedAt: now })
        .where(inArray(templateSets.id, goneSets));
    }

    const hadExercise = new Set(existingExercises.map((row) => row.id));
    const hadSet = new Set(existingSets.map((row) => row.id));

    for (const [position, row] of exercises.entries()) {
      const values = {
        position,
        notes: row.notes,
        restSeconds: row.restSeconds,
        supersetId: row.supersetId,
        updatedAt: now,
      };
      if (hadExercise.has(row.id)) {
        await db.update(templateExercises).set(values).where(eq(templateExercises.id, row.id));
      } else {
        await db.insert(templateExercises).values({
          id: row.id,
          templateId: id,
          exerciseId: row.exerciseId,
          ...values,
        });
      }

      for (const [setPosition, set] of row.sets.entries()) {
        const setRow = setValues(set, row.id, setPosition);
        if (hadSet.has(set.id)) {
          await db
            .update(templateSets)
            .set({ ...setRow, updatedAt: now })
            .where(eq(templateSets.id, set.id));
        } else {
          await db.insert(templateSets).values(setRow);
        }
      }
    }
  });
}

/** App-shipped templates keep the appearance they ship with, so the guard matters. */
export async function setTemplateAppearance(
  templateId: string,
  color: CardColor,
  artwork: CardArtwork | null,
): Promise<void> {
  const previous = await db
    .select({ artwork: templates.artwork, isBuiltIn: templates.isBuiltIn })
    .from(templates)
    .where(eq(templates.id, templateId))
    .get();
  if (!previous || previous.isBuiltIn) return;

  await db
    .update(templates)
    .set({ color, artwork: serializeArtwork(artwork), ...touch() })
    .where(eq(templates.id, templateId));

  // The single write path for the column, so the only place a cover photo can
  // be orphaned by one replacing it.
  const dropped = artworkPhotoFile(asCardArtwork(previous.artwork));
  if (dropped && dropped !== artworkPhotoFile(artwork)) deleteCoverPhoto(dropped);
}

/** `position` is rewritten wholesale — gaps from a soft delete never matter. */
export async function reorderTemplates(orderedIds: readonly string[]): Promise<void> {
  const now = Date.now();
  for (const [position, id] of orderedIds.entries()) {
    await db.update(templates).set({ position, updatedAt: now }).where(eq(templates.id, id));
  }
}

/** A copy is always personal, even when the source is app-shipped. */
export async function duplicateTemplate(templateId: string): Promise<string> {
  const source = await db.select().from(templates).where(eq(templates.id, templateId)).get();
  if (!source) throw new Error(`No template ${templateId}`);

  const rows = await db
    .select()
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position))
    .all();

  // A cover photo is copied rather than shared: two rows pointing at one file
  // would have the first delete take the other's cover with it.
  const sourceArtwork = asCardArtwork(source.artwork);
  const sourcePhoto = artworkPhotoFile(sourceArtwork);
  const artwork = sourcePhoto
    ? serializeArtwork(photoArtwork(await copyCoverPhoto(sourcePhoto)))
    : source.artwork;

  const id = newId();
  await db.insert(templates).values({
    id,
    name: source.name,
    notes: source.notes,
    position: await nextPersonalPosition(),
    isBuiltIn: false,
    folderId: source.isBuiltIn ? null : source.folderId,
    color: source.color,
    artwork,
  });

  if (rows.length > 0) {
    const ids = new Map(rows.map((row) => [row.id, newId()]));
    const supersetIds = new Map<string, string>();

    await db.insert(templateExercises).values(
      rows.map((row, position) => ({
        id: ids.get(row.id)!,
        templateId: id,
        exerciseId: row.exerciseId,
        position,
        notes: row.notes,
        restSeconds: row.restSeconds,
        supersetId: remapSuperset(supersetIds, row.supersetId),
      })),
    );

    const planned = await db
      .select()
      .from(templateSets)
      .where(
        and(
          inArray(
            templateSets.templateExerciseId,
            rows.map((row) => row.id),
          ),
          isNull(templateSets.deletedAt),
        ),
      )
      .orderBy(asc(templateSets.position))
      .all();

    if (planned.length > 0) {
      await db.insert(templateSets).values(
        planned.map((set) => ({
          id: newId(),
          templateExerciseId: ids.get(set.templateExerciseId)!,
          position: set.position,
          weightKg: set.weightKg,
          reps: set.reps,
          durationSeconds: set.durationSeconds,
          distanceM: set.distanceM,
          setType: set.setType,
          notes: set.notes,
        })),
      );
    }
  }

  track('template_created', { source: 'duplicate', exercise_count: rows.length });
  return id;
}

/** Soft delete: workouts started from this template keep a valid `templateId`. */
export async function deleteTemplate(templateId: string): Promise<void> {
  const source = await db
    .select({ isBuiltIn: templates.isBuiltIn })
    .from(templates)
    .where(eq(templates.id, templateId))
    .get();
  if (!source || source.isBuiltIn) return;

  const deletedAt = Date.now();
  await db
    .update(templateSets)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(
      sql`${templateSets.templateExerciseId} IN (
        SELECT id FROM ${templateExercises} WHERE template_id = ${templateId})`,
    );
  await db
    .update(templateExercises)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(templateExercises.templateId, templateId));
  await db
    .update(templates)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(eq(templates.id, templateId));
}

/**
 * The planned numbers are copied in as-is: they are the user's own plan for this
 * session, not readings carried over from a previous one.
 */
export async function startWorkoutFromTemplate(templateId: string): Promise<StartWorkoutResult> {
  const active = await activeWorkoutId();
  if (active) return { status: 'blocked', workoutId: active };

  const template = await db
    .select({ name: templates.name })
    .from(templates)
    .where(eq(templates.id, templateId))
    .get();

  const planned = await db
    .select({
      id: templateExercises.id,
      exerciseId: templateExercises.exerciseId,
      notes: templateExercises.notes,
      restSeconds: templateExercises.restSeconds,
      supersetId: templateExercises.supersetId,
    })
    .from(templateExercises)
    .where(and(eq(templateExercises.templateId, templateId), isNull(templateExercises.deletedAt)))
    .orderBy(asc(templateExercises.position))
    .all();

  const plannedSets = await db
    .select()
    .from(templateSets)
    .where(
      and(
        inArray(
          templateSets.templateExerciseId,
          planned.length > 0 ? planned.map((row) => row.id) : [''],
        ),
        isNull(templateSets.deletedAt),
      ),
    )
    .orderBy(asc(templateSets.position))
    .all();

  const workoutId = newId();
  const startedAt = Date.now();
  await db.insert(workouts).values({
    id: workoutId,
    templateId,
    name: template?.name ?? null,
    startedAt,
    createdAt: startedAt,
    updatedAt: startedAt,
  });

  const supersetIds = new Map<string, string>();

  for (const [position, row] of planned.entries()) {
    const workoutExerciseId = newId();
    await db.insert(workoutExercises).values({
      id: workoutExerciseId,
      workoutId,
      exerciseId: row.exerciseId,
      position,
      notes: row.notes,
      restSeconds: row.restSeconds,
      supersetId: remapSuperset(supersetIds, row.supersetId),
    });

    const own = plannedSets.filter((set) => set.templateExerciseId === row.id);
    // A template saved with every set deleted — and every un-backfilled one from
    // before templates had planned sets — still opens with something to log into.
    await db.insert(sets).values(
      own.length === 0
        ? [{ id: newId(), workoutExerciseId, position: 0 }]
        : own.map((set, index) => ({
            id: newId(),
            workoutExerciseId,
            position: index,
            weightKg: set.weightKg,
            reps: set.reps,
            durationSeconds: set.durationSeconds,
            distanceM: set.distanceM,
            setType: set.setType,
          })),
    );
  }

  await db
    .update(templates)
    .set({ lastUsedAt: startedAt, ...touch() })
    .where(eq(templates.id, templateId));

  track('workout_started', { source: 'template', exercise_count: planned.length });
  return { status: 'started', workoutId };
}
