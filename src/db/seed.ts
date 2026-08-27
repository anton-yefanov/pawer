import { eq, inArray, sql } from 'drizzle-orm';

import { asCardColor } from '@/constants/card-colors';
import { emojiArtwork, serializeArtwork } from '@/lib/card-artwork';
import { buildSearchText } from '@/lib/exercise-search';

import { newId } from './id';
import type { Database } from './client';
import { exercises, settings, templateExercises, templates, templateSets } from './schema';
import seedExercises from './seed/exercises.json';
import seedTemplateData from './seed/templates.json';

/**
 * Bump when src/db/seed/exercises.json or seed/templates.json changes so
 * existing installs re-seed on next launch. Seeding is an upsert keyed on
 * `sourceId`, so bumping this never touches logged sets — exercise UUIDs are
 * derived from the upstream slug and stay stable across rebuilds (see
 * scripts/build-exercise-seed.mjs), and template rows keep the id they were
 * first inserted with, so `workouts.template_id` references survive.
 */
export const SEED_VERSION = 11;

const SEED_VERSION_KEY = 'seed_version';

/** SQLite caps bound parameters per statement; 16 columns × 100 rows is safe. */
const CHUNK_SIZE = 100;

type SeedExercise = (typeof seedExercises)[number];

export async function getSetting(db: Database, key: string): Promise<string | null> {
  const row = await db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

export async function setSetting(db: Database, key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: sql`(unixepoch() * 1000)` },
    });
}

/**
 * Seeds the bundled exercise library. Idempotent: safe to call on every launch,
 * cheap when already current.
 */
export async function seedIfNeeded(db: Database): Promise<{ seeded: boolean; count: number }> {
  const current = Number(await getSetting(db, SEED_VERSION_KEY)) || 0;
  if (current >= SEED_VERSION) {
    return { seeded: false, count: 0 };
  }

  const rows: SeedExercise[] = seedExercises;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await db
      .insert(exercises)
      .values(
        // `instructions` stays in the seed JSON for tools/image-uploader's
        // reference panel; the app has no column for it.
        chunk.map(({ instructions: _instructions, ...e }) => ({
          ...e,
          searchText: buildSearchText(e),
          isCustom: false,
        })),
      )
      .onConflictDoUpdate({
        target: exercises.sourceId,
        set: {
          // Refresh library metadata, but never clobber user-owned columns.
          name: sql`excluded.name`,
          force: sql`excluded.force`,
          level: sql`excluded.level`,
          mechanic: sql`excluded.mechanic`,
          equipment: sql`excluded.equipment`,
          category: sql`excluded.category`,
          trackingType: sql`excluded.tracking_type`,
          primaryMuscles: sql`excluded.primary_muscles`,
          secondaryMuscles: sql`excluded.secondary_muscles`,
          tags: sql`excluded.tags`,
          searchText: sql`excluded.search_text`,
          deletedAt: null,
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });
  }

  await seedTemplates(db);

  await setSetting(db, SEED_VERSION_KEY, String(SEED_VERSION));
  return { seeded: true, count: rows.length };
}

/**
 * App-shipped templates. Runs after the exercise upsert because it resolves
 * exercise ids from the rows just written.
 *
 * Exercise rows are replaced rather than diffed: nothing references them and
 * they are app-owned, so a hard delete is safe and keeps the update honest when
 * a template's contents change between versions.
 */
async function seedTemplates(db: Database): Promise<void> {
  const exerciseIdBySource = new Map(
    (await db.select({ id: exercises.id, sourceId: exercises.sourceId }).from(exercises).all())
      .filter((row): row is { id: string; sourceId: string } => row.sourceId !== null)
      .map((row) => [row.sourceId, row.id])
  );

  for (const template of seedTemplateData) {
    await db
      .insert(templates)
      .values({
        id: newId(),
        sourceId: template.sourceId,
        name: template.name,
        position: template.position,
        color: asCardColor(template.color),
        artwork: serializeArtwork(emojiArtwork([template.artwork])),
        isBuiltIn: true,
      })
      .onConflictDoUpdate({
        target: templates.sourceId,
        set: {
          name: sql`excluded.name`,
          position: sql`excluded.position`,
          color: sql`excluded.color`,
          artwork: sql`excluded.artwork`,
          isBuiltIn: true,
          deletedAt: null,
          updatedAt: sql`(unixepoch() * 1000)`,
        },
      });
  }

  const stored = await db
    .select({ id: templates.id, sourceId: templates.sourceId })
    .from(templates)
    .where(
      inArray(
        templates.sourceId,
        seedTemplateData.map((t) => t.sourceId)
      )
    )
    .all();
  const templateIdBySource = new Map(stored.map((row) => [row.sourceId, row.id]));

  for (const template of seedTemplateData) {
    const templateId = templateIdBySource.get(template.sourceId);
    if (!templateId) continue;

    const previous = await db
      .select({ id: templateExercises.id })
      .from(templateExercises)
      .where(eq(templateExercises.templateId, templateId))
      .all();
    if (previous.length > 0) {
      await db.delete(templateSets).where(
        inArray(
          templateSets.templateExerciseId,
          previous.map((row) => row.id),
        ),
      );
    }
    await db.delete(templateExercises).where(eq(templateExercises.templateId, templateId));

    // `targetSets` / `targetReps` are the JSON's authoring shape; the table stores
    // one row per planned set, so this is the only place that expands them.
    const rows = template.exercises
      .map((entry, position) => {
        const exerciseId = exerciseIdBySource.get(entry.exerciseSourceId);
        if (!exerciseId) return null;
        return { id: newId(), templateId, exerciseId, position, entry };
      })
      .filter((row) => row !== null);

    if (rows.length === 0) continue;

    await db.insert(templateExercises).values(rows.map(({ entry: _entry, ...row }) => row));

    await db.insert(templateSets).values(
      rows.flatMap(({ id, entry }) =>
        Array.from({ length: entry.targetSets }, (_, position) => ({
          id: newId(),
          templateExerciseId: id,
          position,
          reps: entry.targetReps ?? null,
        })),
      ),
    );
  }
}
