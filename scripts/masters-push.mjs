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
import { MASTER_SIZE } from '../tools/image-uploader/master-spec.mjs';
import { listStored, putMaster, readCrops, writeCrops } from '../tools/image-uploader/store.mjs';

const NAME = /^(.+)_([12])\.png$/;

requireBlobToken();

const stored = await listStored();
const crops = await readCrops();
let uploaded = 0;
let skipped = 0;
for (const name of await readdir(EXERCISE_MASTERS)) {
  const match = NAME.exec(name);
  if (!match || !byId.has(match[1])) continue;
  if (stored.has(name)) {
    skipped += 1;
    continue;
  }
  // What git holds is already a square, so it doubles as its own source and the
  // crop that produced it is the whole canvas.
  const png = await readFile(resolve(EXERCISE_MASTERS, name));
  await putMaster(match[1], match[2], png, png);
  crops[name] = { x: 0, y: 0, size: MASTER_SIZE };
  uploaded += 1;
}
if (uploaded) await writeCrops(crops);

console.log(`${uploaded} uploaded, ${skipped} already in the store`);
