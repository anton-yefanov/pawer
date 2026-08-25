#!/usr/bin/env node
/**
 * Uploads the exercise masters already sitting in assets/masters/exercises/ into
 * Vercel Blob — the one-off that seeds the store from what git still holds.
 */
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { requireBlobToken } from '../tools/image-uploader/local-env.mjs';
import { byId } from '../tools/image-uploader/seed.mjs';
import { EXERCISE_MASTERS } from '../tools/image-uploader/paths.mjs';
import { listStored, putMaster } from '../tools/image-uploader/store.mjs';

const NAME = /^(.+)_([12])\.png$/;

requireBlobToken();

const stored = await listStored();
let uploaded = 0;
let skipped = 0;
for (const name of await readdir(EXERCISE_MASTERS)) {
  const match = NAME.exec(name);
  if (!match || !byId.has(match[1])) continue;
  if (stored.has(name)) {
    skipped += 1;
    continue;
  }
  await putMaster(match[1], match[2], await readFile(resolve(EXERCISE_MASTERS, name)));
  uploaded += 1;
}

console.log(`${uploaded} uploaded, ${skipped} already in the store`);
