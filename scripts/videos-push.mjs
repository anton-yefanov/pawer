#!/usr/bin/env node
/**
 * Uploads the compressed clips to Vercel Blob. 106 MB of encoded video is not
 * something git should carry, and re-encoding it from the vendor originals
 * takes the better part of an hour — see CLAUDE.md §Assets.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { PREFIX, ROOT, listStoredVideos, requireBlobToken } from './blob-env.mjs';
import { GROUP_IDS } from './exercise-taxonomy.mjs';

requireBlobToken();

const { put } = await import('@vercel/blob');
const DIR = resolve(ROOT, 'assets/exercise-videos');
const stored = await listStoredVideos();

let uploaded = 0;
let skipped = 0;
for (const tag of GROUP_IDS) {
  for (const name of await readdir(resolve(DIR, tag))) {
    if (!name.endsWith('.mp4')) continue;
    const file = resolve(DIR, tag, name);
    const key = `${tag}/${name}`;
    const local = Math.round((await stat(file)).mtimeMs);
    if (stored.get(key)?.mtime >= local) {
      skipped += 1;
      continue;
    }
    await put(`${PREFIX}${key}`, await readFile(file), {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    uploaded += 1;
  }
}

console.log(`${uploaded} uploaded, ${skipped} already current`);
