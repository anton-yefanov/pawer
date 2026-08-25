#!/usr/bin/env node
/**
 * Mirrors the exercise masters out of Vercel Blob into assets/masters/exercises/,
 * which is what `npm run build:images` reads. The store is the source of truth;
 * a local master the store no longer has is deleted.
 */
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { requireBlobToken } from '../tools/image-uploader/local-env.mjs';
import { byId } from '../tools/image-uploader/seed.mjs';
import { EXERCISE_MASTERS, masterPath } from '../tools/image-uploader/paths.mjs';
import { listStored } from '../tools/image-uploader/store.mjs';

const NAME = /^(.+)_([12])\.png$/;

requireBlobToken();

const stored = await listStored();
await mkdir(EXERCISE_MASTERS, { recursive: true });

let written = 0;
let skipped = 0;
for (const [name, { url, mtime }] of stored) {
  const match = NAME.exec(name);
  if (!match || !byId.has(match[1])) {
    console.log(`skipping ${name} — not an exercise in the seed`);
    continue;
  }
  const file = masterPath(match[1], match[2]);
  const local = await stat(file).then((s) => Math.round(s.mtimeMs), () => 0);
  if (local >= mtime) {
    skipped += 1;
    continue;
  }
  const res = await fetch(`${url}?v=${mtime}`);
  if (!res.ok) throw new Error(`${name} failed to download with ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  written += 1;
}

let removed = 0;
for (const name of await readdir(EXERCISE_MASTERS)) {
  const match = NAME.exec(name);
  if (!match || !byId.has(match[1]) || stored.has(name)) continue;
  await rm(resolve(EXERCISE_MASTERS, name));
  removed += 1;
}

console.log(`${written} downloaded, ${skipped} already current, ${removed} removed`);
