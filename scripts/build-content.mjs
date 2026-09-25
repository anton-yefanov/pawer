#!/usr/bin/env node
/**
 * Writes the English content catalogs a translation starts from:
 *
 *   src/i18n/content/en/exercises.json  sourceId → { name, tags }
 *   src/i18n/content/en/templates.json  sourceId → name
 *   src/i18n/content/en/folders.json    sourceId → name
 *
 * Generated from the seed, never authored. Another language is a sibling folder
 * with the same shape; a key it leaves out falls back to English at seed time.
 * `npm run build:seed` runs this too.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = resolve(ROOT, 'src/db/seed');
const OUT = resolve(ROOT, 'src/i18n/content/en');

const read = (name) => JSON.parse(readFileSync(resolve(SEED, name), 'utf8'));
const write = (name, value) =>
  writeFileSync(resolve(OUT, name), `${JSON.stringify(value, null, 2)}\n`);

const byName = (rows) => Object.fromEntries(rows.map((row) => [row.sourceId, row.name]));

mkdirSync(OUT, { recursive: true });
write(
  'exercises.json',
  Object.fromEntries(
    read('exercises.json').map((row) => [row.sourceId, { name: row.name, tags: row.tags }])
  )
);
write('templates.json', byName(read('templates.json')));
write('folders.json', byName(read('folders.json')));

console.log(`Wrote content catalogs to ${OUT}`);
