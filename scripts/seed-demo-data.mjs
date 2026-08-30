/**
 * Fills a simulator's pawer.db with a year of plausible training history, sized
 * so every comparison label on the Analytics screen has something to compare
 * against. For App Store screenshots — never run against a real device DB.
 *
 * Usage: node scripts/seed-demo-data.mjs [path/to/pawer.db]
 */
import { DatabaseSync } from 'node:sqlite';
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const DAY = 86_400_000;
const WEEKS = 53;

function findDatabase() {
  const found = execSync(
    'find ~/Library/Developer/CoreSimulator/Devices -name pawer.db -not -path "*ExponentExperienceData*" 2>/dev/null || true',
    { shell: '/bin/zsh', encoding: 'utf8' }
  )
    .split('\n')
    .filter(Boolean);
  if (found.length === 0) throw new Error('no pawer.db found in any simulator');
  return found
    .map((path) => ({ path, at: execSync(`stat -f %m ${path}`, { encoding: 'utf8' }).trim() }))
    .sort((a, b) => Number(b.at) - Number(a.at))[0].path;
}

const rng = (() => {
  let state = 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
})();

const jitter = (spread) => Math.round((rng() - 0.5) * 2 * spread);

/** `weeks` is how many weeks of training have already happened at this point. */
function lift(id, { base, step, every, phase = 0, sets, reps, warmups = 0 }) {
  return { id, base, step, every, phase, sets, reps, warmups };
}

const ROUTINES = [
  {
    name: 'Push Day',
    entries: [
      lift('barbell-bench-press', { base: 72.5, step: 2.5, every: 7, sets: 4, reps: [8, 8, 7, 6], warmups: 2 }),
      lift('dumbbell-incline-bench-press', { base: 26, step: 2, every: 8, phase: 3, sets: 3, reps: [10, 10, 9] }),
      lift('barbell-overhead-press', { base: 42.5, step: 2.5, every: 9, phase: 5, sets: 3, reps: [8, 8, 7], warmups: 1 }),
      lift('dumbbell-lateral-raise', { base: 10, step: 2, every: 12, phase: 2, sets: 3, reps: [15, 14, 12] }),
      lift('cable-rope-pushdown', { base: 27.5, step: 2.5, every: 8, phase: 6, sets: 3, reps: [13, 12, 11] }),
    ],
  },
  {
    name: 'Pull Day',
    entries: [
      lift('barbell-deadlift', { base: 115, step: 5, every: 9, phase: 1, sets: 3, reps: [5, 5, 4], warmups: 2 }),
      lift('barbell-bent-over-row', { base: 60, step: 2.5, every: 7, phase: 4, sets: 4, reps: [9, 8, 8, 7], warmups: 1 }),
      lift('lat-pulldown', { base: 55, step: 2.5, every: 6, phase: 2, sets: 3, reps: [11, 10, 9] }),
      lift('pull-ups', { base: 0, step: 2.5, every: 10, phase: 7, sets: 3, reps: [8, 7, 6] }),
      lift('dumbbell-curl', { base: 12, step: 2, every: 10, phase: 8, sets: 3, reps: [12, 11, 10] }),
      lift('inverted-row', { base: 0, step: 0, every: 0, sets: 3, reps: [14, 13, 12] }),
    ],
  },
  {
    name: 'Leg Day',
    entries: [
      lift('barbell-squat', { base: 92.5, step: 5, every: 8, phase: 3, sets: 4, reps: [7, 6, 6, 5], warmups: 2 }),
      lift('barbell-romanian-deadlift', { base: 72.5, step: 2.5, every: 7, phase: 6, sets: 3, reps: [9, 8, 8], warmups: 1 }),
      lift('machine-leg-press', { base: 150, step: 10, every: 9, phase: 2, sets: 3, reps: [12, 11, 10] }),
      lift('lying-leg-curl', { base: 35, step: 2.5, every: 8, phase: 5, sets: 3, reps: [12, 12, 10] }),
      lift('barbell-hip-thrust', { base: 85, step: 5, every: 10, phase: 1, sets: 3, reps: [11, 10, 9] }),
    ],
  },
  {
    name: 'Conditioning',
    entries: [
      { id: 'treadmill-run', cardio: { distanceM: 6200, seconds: 1980 } },
      lift('push-up', { base: 0, step: 0, every: 0, sets: 3, reps: [24, 21, 18] }),
      lift('kettlebell-goblet-squat', { base: 20, step: 4, every: 12, phase: 4, sets: 3, reps: [15, 14, 12] }),
      lift('dumbbell-lateral-raise', { base: 9, step: 2, every: 14, phase: 9, sets: 3, reps: [16, 15, 14] }),
    ],
  },
];

/** Days-ago offsets, newest first. The two live weeks are hand-shaped so the
 * current period out-trains the one behind it on every tile. */
function schedule() {
  const offsets = [0, 1, 3, 4, 6, 8, 10, 11, 13];
  for (let week = 2; week < WEEKS; week++) {
    const base = week * 7;
    for (const day of week % 5 === 2 ? [1, 3, 6] : [1, 3, 4, 6]) offsets.push(base + day);
  }
  return offsets.sort((a, b) => b - a);
}

function startOfDay(ms) {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

const epley = (weightKg, reps) => weightKg * (1 + reps / 30);

function candidateValues(set, type) {
  const reps = set.reps ?? 0;
  if (reps <= 0) return {};
  if (type === 'weight_reps' || type === 'weighted_bodyweight') {
    const weightKg = set.weightKg ?? 0;
    if (weightKg <= 0) return {};
    return { heaviest_weight: weightKg, best_1rm: epley(weightKg, reps), best_volume: weightKg * reps };
  }
  if (type === 'bodyweight_reps') return { most_reps: reps };
  return {};
}

const path = process.argv[2] ?? findDatabase();
if (!existsSync(path)) throw new Error(`no database at ${path}`);
copyFileSync(path, `${path}.backup`);
console.log(`database: ${path}\nbackup:   ${path}.backup`);

const db = new DatabaseSync(path);
db.exec('PRAGMA foreign_keys = OFF');

const library = new Map(
  db
    .prepare('SELECT id, source_id, name, tracking_type FROM exercises WHERE source_id IS NOT NULL')
    .all()
    .map((row) => [row.source_id, row])
);
for (const routine of ROUTINES) {
  for (const entry of routine.entries) {
    if (!library.has(entry.id)) throw new Error(`unknown exercise: ${entry.id}`);
  }
}

db.exec('DELETE FROM personal_records');
db.exec('DELETE FROM sets');
db.exec('DELETE FROM workout_exercises');
db.exec('DELETE FROM workouts');

const insertWorkout = db.prepare(
  `INSERT INTO workouts (id, name, notes, started_at, finished_at, template_id, created_at, updated_at, deleted_at)
   VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, NULL)`
);
const insertEntry = db.prepare(
  `INSERT INTO workout_exercises (id, workout_id, exercise_id, position, notes, rest_seconds, superset_id, created_at, updated_at, deleted_at)
   VALUES (?, ?, ?, ?, NULL, ?, NULL, ?, ?, NULL)`
);
const insertSet = db.prepare(
  `INSERT INTO sets (id, workout_exercise_id, position, weight_kg, reps, duration_seconds, distance_m, completed, completed_at, set_type, notes, created_at, updated_at, deleted_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NULL, ?, ?, NULL)`
);
const insertRecord = db.prepare(
  `INSERT INTO personal_records (id, exercise_id, workout_id, kind, value, set_id, achieved_at, created_at, updated_at, deleted_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
);

const today = startOfDay(Date.now());
const offsets = schedule();
const standing = new Map();
const stats = [];

offsets.forEach((offset, index) => {
  const weeksAgo = Math.floor(offset / 7);
  const weeksTrained = WEEKS - weeksAgo;
  const deload = weeksAgo % 9 === 4;
  const routine = ROUTINES[index % ROUTINES.length];

  const day = startOfDay(today - offset * DAY);
  const startedAt = day + (offset === 0 ? 7 : 7 + (index % 3)) * 3_600_000 + 15 * 60_000 + jitter(20) * 60_000;
  const lifting = routine.name !== 'Conditioning';
  const minutes = (lifting ? 68 : 46) + jitter(7) - (deload ? 9 : 0) + (offset < 7 ? 4 : 0);
  const finishedAt = startedAt + minutes * 60_000;

  const workoutId = randomUUID();
  insertWorkout.run(workoutId, routine.name, startedAt, finishedAt, startedAt, finishedAt);

  const best = new Map();
  let position = 0;
  let setCount = 0;
  let volume = 0;

  routine.entries.forEach((entry, entryIndex) => {
    // The live week peaks on a couple of lifts a session, which is what puts a
    // believable handful of records on the screen instead of a clean sweep.
    const peaking = offset < 7 && entryIndex % 3 === 0;
    const exercise = library.get(entry.id);
    const entryId = randomUUID();
    insertEntry.run(entryId, workoutId, exercise.id, position++, lifting ? 150 : 90, startedAt, finishedAt);

    const rows = [];
    if (entry.cardio) {
      rows.push({
        setType: 'normal',
        distanceM: entry.cardio.distanceM + jitter(500) + (offset < 7 ? 400 : 0),
        durationSeconds: entry.cardio.seconds + jitter(90),
      });
    } else {
      const steps = entry.every > 0 ? Math.floor((weeksTrained + entry.phase) / (entry.every * 2)) : 0;
      const weightKg = Math.max(0, (entry.base + entry.step * steps) * (deload ? 0.85 : 1));
      const rounded = entry.step > 0 ? Math.round(weightKg / entry.step) * entry.step : weightKg;
      for (let i = 0; i < entry.sets; i++) rows.push({ setType: 'warmup', skip: i >= entry.warmups });
      for (let i = 0; i < entry.warmups; i++) {
        rows[i] = {
          setType: 'warmup',
          weightKg: Math.round((rounded * (0.5 + 0.15 * i)) / 2.5) * 2.5,
          reps: 8,
        };
      }
      for (let i = 0; i < entry.sets; i++) {
        const reps = Math.max(1, entry.reps[i] - (deload ? 2 : 0) + (peaking && i === 0 ? 1 : 0));
        rows[entry.warmups + i] = { setType: 'normal', weightKg: rounded, reps };
      }
      rows.length = entry.warmups + entry.sets;
      // A back-off set repeats the top set's numbers, so the live week carries
      // more tonnage without every lift claiming a volume record for it.
      if (offset < 7 && entry.sets > 2 && entryIndex % 2 === 0) rows.push({ ...rows[rows.length - 1] });
    }

    let setPosition = 0;
    let completedAt = startedAt + position * 6 * 60_000;
    for (const row of rows) {
      const setId = randomUUID();
      completedAt += 3 * 60_000;
      insertSet.run(
        setId,
        entryId,
        setPosition++,
        row.weightKg ?? null,
        row.reps ?? null,
        row.durationSeconds ?? null,
        row.distanceM ?? null,
        completedAt,
        row.setType,
        startedAt,
        completedAt
      );
      if (row.setType === 'warmup') continue;
      setCount++;
      if (exercise.tracking_type === 'weight_reps' || exercise.tracking_type === 'weighted_bodyweight') {
        volume += (row.weightKg ?? 0) * (row.reps ?? 0);
      }
      for (const [kind, value] of Object.entries(candidateValues(row, exercise.tracking_type))) {
        const key = `${exercise.id}:${kind}`;
        const held = best.get(key);
        if (!held || value > held.value) best.set(key, { exerciseId: exercise.id, kind, value, setId });
      }
    }
  });

  let records = 0;
  for (const [key, candidate] of best) {
    const held = standing.get(key);
    if (held != null && candidate.value <= held) continue;
    standing.set(key, candidate.value);
    insertRecord.run(
      randomUUID(),
      candidate.exerciseId,
      workoutId,
      candidate.kind,
      candidate.value,
      candidate.setId,
      finishedAt,
      finishedAt,
      finishedAt
    );
    records++;
  }

  stats.push({ offset, startedAt, durationMs: finishedAt - startedAt, setCount, volume, records });
});

db.close();

const window = (from, to) => {
  const rows = stats.filter((row) => row.offset >= from && row.offset <= to);
  const sum = (pick) => rows.reduce((total, row) => total + pick(row), 0);
  return {
    workouts: rows.length,
    tonnage: Math.round(sum((row) => row.volume)),
    sets: sum((row) => row.setCount),
    prs: sum((row) => row.records),
    hours: (sum((row) => row.durationMs) / 3_600_000).toFixed(1),
  };
};

console.log(`workouts: ${stats.length}, first: ${new Date(stats[0].startedAt).toDateString()}`);
console.table({ 'last 7 days': window(0, 6), 'previous 7': window(7, 13), 'last 30': window(0, 29), 'previous 30': window(30, 59) });
