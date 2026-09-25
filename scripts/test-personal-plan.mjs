import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { build } from 'esbuild';
import { drizzle } from 'drizzle-orm/expo-sqlite/driver';

// Keep real Drizzle queries/transactions. Only replace native platform boundaries.
const compiled = await build({
  stdin: {
    contents:
      'export { savePersonalPlan } from "./src/lib/save-personal-plan"; export { buildPersonalPlan, FOCUS_MUSCLES } from "./src/lib/personal-plan";',
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
  define: { __DEV__: 'false' },
  plugins: [
    {
      name: 'native-boundaries',
      setup(builder) {
        builder.onResolve({ filter: /^@\/db\/client$/ }, () => ({
          path: 'db',
          namespace: 'test',
        }));
        builder.onResolve({ filter: /^@\/db\/id$/ }, () => ({
          path: 'id',
          namespace: 'test',
        }));
        builder.onResolve({ filter: /^expo-localization$/ }, () => ({
          path: 'localization',
          namespace: 'test',
        }));
        builder.onResolve({ filter: /^@\/lib\/observability$/ }, () => ({
          path: 'observability',
          namespace: 'test',
        }));
        builder.onLoad({ filter: /.*/, namespace: 'test' }, ({ path }) => ({
          contents:
            path === 'id'
              ? 'export { randomUUID as newId } from "node:crypto";'
              : path === 'db'
                ? 'export const db = undefined;'
                : path === 'localization'
                  ? 'export const getLocales = () => [{ languageCode: "en", regionCode: "US" }];'
                  : 'export function report() {}',
          loader: 'js',
        }));
      },
    },
  ],
});
const temporary = mkdtempSync(join(tmpdir(), 'pawer-plan-test-'));
const bundle = join(temporary, 'storage.cjs');
writeFileSync(bundle, compiled.outputFiles[0].text);
const { savePersonalPlan, buildPersonalPlan, FOCUS_MUSCLES } = createRequire(import.meta.url)(
  bundle
);

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of readdirSync('drizzle')
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(join('drizzle', file), 'utf8'));
  }
  const insert = sqlite.prepare(
    'INSERT INTO exercises (id, source_id, name, level, equipment, category, tracking_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const exercise of JSON.parse(readFileSync('src/db/seed/exercises.json', 'utf8'))) {
    insert.run(
      exercise.id,
      exercise.sourceId,
      exercise.name,
      exercise.level,
      exercise.equipment,
      exercise.category,
      exercise.trackingType
    );
  }
  const database = drizzle({
    prepareSync(sql) {
      const statement = sqlite.prepare(sql);
      return {
        executeSync(params) {
          if (/^\s*select/i.test(sql))
            return {
              getAllSync: () => statement.all(...params),
              getFirstSync: () => statement.get(...params),
            };
          const result = statement.run(...params);
          return {
            changes: result.changes,
            lastInsertRowId: Number(result.lastInsertRowid),
          };
        },
        executeForRawResultSync(params) {
          return {
            getAllSync: () => statement.all(...params).map(Object.values),
          };
        },
      };
    },
  });
  return { sqlite, database };
}
const answers = {
  goal: 'muscle',
  experience: 'new',
  equipment: 'gym',
  days: 3,
  minutes: 50,
};
try {
  const exercises = JSON.parse(readFileSync('src/db/seed/exercises.json', 'utf8'));
  const library = new Map(exercises.map((exercise) => [exercise.sourceId, exercise]));
  let checked = 0;
  let focusChecked = 0;
  let focusEffective = 0;
  const FOCUSES = [
    [],
    ['full'],
    ['chest'],
    ['back'],
    ['shoulders'],
    ['arms'],
    ['core'],
    ['legs'],
    ['glutes'],
    ['arms', 'chest'],
    ['legs', 'glutes', 'core'],
    ['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'glutes'],
  ];
  for (const goal of ['strength', 'muscle', 'consistency'])
    for (const experience of ['new', 'returning', 'experienced'])
      for (const equipment of ['gym', 'dumbbells', 'bodyweight'])
        for (const days of [2, 3, 4])
          for (const minutes of [20, 35, 50])
            for (const focus of FOCUSES) {
              const answers = { goal, experience, equipment, days, minutes, focus };
              const plan = buildPersonalPlan(answers);
              const context = JSON.stringify(answers);
              assert(plan.workouts.length >= 1 && plan.workouts.length <= 3, context);
              assert.equal(
                new Set(plan.workouts.map((workout) => workout.name)).size,
                plan.workouts.length
              );
              for (const workout of plan.workouts) {
                assert(workout.estimatedMinutes <= minutes, `Time budget: ${context}`);
                assert(workout.estimatedMinutes >= minutes * 0.75, `Fills the time: ${context}`);
                const groups = Map.groupBy(
                  workout.exercises.filter((target) => target.superset !== null),
                  (target) => target.superset
                );
                for (const members of groups.values()) assert.equal(members.length, 2, context);
                if (groups.size > 0) assert(experience !== 'new', context);
                assert(workout.exercises.length >= 3, context);
                assert(workout.notes.includes(plan.schedule), context);
                assert.equal(
                  new Set(workout.exercises.map((exercise) => exercise.sourceId)).size,
                  workout.exercises.length,
                  context
                );
                for (const target of workout.exercises) {
                  const exercise = library.get(target.sourceId);
                  assert(exercise, `${target.sourceId}: ${context}`);
                  assert(
                    ['duration', 'bodyweight_reps', 'weight_reps'].includes(exercise.trackingType),
                    `${exercise.sourceId}: ${exercise.trackingType}`
                  );
                  if (equipment === 'bodyweight')
                    assert.equal(exercise.equipment, 'bodyweight', context);
                  if (equipment === 'dumbbells')
                    assert(['bodyweight', 'dumbbell'].includes(exercise.equipment), context);
                  assert(target.sets >= 2 && target.reps > 0 && target.restSeconds > 0, context);
                  if (exercise.trackingType === 'weight_reps')
                    assert(target.sets >= 3, `${target.sourceId} sets: ${context}`);
                }
              }
              const trains = (target, muscles) =>
                library
                  .get(target.sourceId)
                  .primaryMuscles.some((muscle) => muscles.includes(muscle));
              const emphasis = focus.filter((area) => area !== 'full');
              // Emphasising everything is a balanced plan by another name.
              if (emphasis.length > 0 && emphasis.length <= 3) {
                const muscles = emphasis.flatMap((area) => FOCUS_MUSCLES[area]);
                const setsOn = (p) =>
                  p.workouts
                    .flatMap((workout) => workout.exercises)
                    .filter((target) => trains(target, muscles))
                    .reduce((n, target) => n + target.sets, 0);
                const balanced = buildPersonalPlan({ ...answers, focus: [] });
                // Several areas share the session, so only a single focus is held to this.
                if (emphasis.length === 1)
                  assert(
                    setsOn(plan) >= setsOn(balanced),
                    `Focus never costs its area: ${context}`
                  );
                // The floor has no shoulder or arm isolation, and a Lower day is all legs already.
                const inherent =
                  (equipment === 'bodyweight' && ['shoulders', 'arms'].includes(emphasis[0])) ||
                  (days === 4 &&
                    equipment !== 'bodyweight' &&
                    ['legs', 'glutes'].includes(emphasis[0]));
                if (minutes > 20 && emphasis.length === 1 && !inherent) {
                  focusChecked++;
                  if (setsOn(plan) > setsOn(balanced)) focusEffective++;
                }
              }
              if (minutes > 20) {
                const shorter = buildPersonalPlan({
                  ...answers,
                  minutes: minutes === 50 ? 35 : 20,
                });
                const volume = (p) =>
                  p.workouts.reduce(
                    (sum, workout) => sum + workout.exercises.reduce((n, e) => n + e.sets, 0),
                    0
                  );
                // Twenty minutes buys its volume with supersets; thirty-five spends the time on rest.
                if (minutes === 50) assert(volume(plan) > volume(shorter), `More work: ${context}`);
                else assert(volume(plan) >= volume(shorter), `More work: ${context}`);
              }
              checked++;
            }
  // The rest are tight beginner sessions with no time to spare.
  assert(
    focusEffective / focusChecked >= 0.95,
    `Focus adds work in ${focusEffective} of ${focusChecked} profiles`
  );
  console.log(
    `Verified ${checked} profiles: valid exercises, equipment, tracking types, schedules and 1–3 unique templates.`
  );

  const { sqlite, database } = fixture();
  const folderId = savePersonalPlan(answers, database);
  assert.equal(
    sqlite.prepare('SELECT name FROM folders WHERE id = ?').get(folderId).name,
    'Your Personal Plan'
  );
  assert.equal(
    sqlite.prepare('SELECT count(*) AS n FROM templates WHERE folder_id = ?').get(folderId).n,
    3
  );
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM template_exercises').get().n, 24);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM template_sets').get().n, 72);
  assert.equal(
    sqlite.prepare('SELECT count(*) AS n FROM template_sets WHERE weight_kg IS NOT NULL').get().n,
    0
  );
  assert(
    sqlite
      .prepare(
        'SELECT count(*) AS n FROM template_sets WHERE duration_seconds IS NOT NULL AND reps IS NULL'
      )
      .get().n > 0
  );
  assert.equal(savePersonalPlan(answers, database), folderId);
  assert.equal(
    sqlite.prepare('SELECT count(*) AS n FROM folders WHERE is_built_in = 0').get().n,
    1
  );
  sqlite
    .prepare('UPDATE templates SET name = ? WHERE folder_id = ?')
    .run('My edited workout', folderId);
  assert.equal(savePersonalPlan(answers, database), folderId);
  assert.equal(
    sqlite.prepare('SELECT name FROM templates WHERE folder_id = ? LIMIT 1').get(folderId).name,
    'My edited workout'
  );
  assert.deepEqual(sqlite.prepare('PRAGMA foreign_key_check').all(), []);
  sqlite.close();

  const paired = fixture();
  savePersonalPlan({ ...answers, experience: 'returning', minutes: 20 }, paired.database);
  const groups = paired.sqlite
    .prepare(
      'SELECT count(*) AS n FROM template_exercises WHERE superset_id IS NOT NULL GROUP BY superset_id'
    )
    .all();
  assert(groups.length > 0 && groups.every((group) => group.n === 2), 'Supersets saved as pairs');
  paired.sqlite.close();

  const broken = fixture();
  broken.sqlite.prepare('DELETE FROM exercises WHERE source_id = ?').run('machine-leg-press');
  assert.throws(() => savePersonalPlan(answers, broken.database), /unavailable/);
  for (const table of ['folders', 'templates', 'template_exercises', 'template_sets']) {
    assert.equal(
      broken.sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n,
      0,
      `${table} rolled back`
    );
  }
  assert.equal(
    broken.sqlite.prepare('SELECT count(*) AS n FROM settings WHERE key LIKE ?').get('onboarding_%')
      .n,
    0
  );
  broken.sqlite.close();
  console.log(
    'Verified real SQLite persistence: complete plan, tracking fields, idempotent retries, preserved edits, foreign keys and rollback on failure.'
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
