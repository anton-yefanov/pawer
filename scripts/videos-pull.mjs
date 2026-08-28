#!/usr/bin/env node
/**
 * Mirrors the compressed clips out of Vercel Blob into assets/exercise-videos/,
 * which is what the generated media map `require`s into the bundle.
 * The store is the source of truth; a local clip it no longer has is deleted.
 */
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ROOT, listStoredVideos, requireBlobToken } from './blob-env.mjs';
import { GROUP_IDS } from './exercise-taxonomy.mjs';

requireBlobToken();

const DIR = resolve(ROOT, 'assets/exercise-videos');
const stored = await listStoredVideos();
for (const tag of GROUP_IDS) await mkdir(resolve(DIR, tag), { recursive: true });

let written = 0;
let skipped = 0;
for (const [key, { url, mtime }] of stored) {
  const file = resolve(DIR, key);
  const local = await stat(file).then((s) => Math.round(s.mtimeMs), () => 0);
  if (local >= mtime) {
    skipped += 1;
    continue;
  }
  // Cache-busted: a pathname written twice serves the old bytes from the CDN
  // for a while afterwards.
  const res = await fetch(`${url}?v=${mtime}`);
  if (!res.ok) throw new Error(`${key} failed to download with ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  written += 1;
}

let removed = 0;
for (const tag of GROUP_IDS) {
  for (const name of await readdir(resolve(DIR, tag))) {
    if (!name.endsWith('.mp4') || stored.has(`${tag}/${name}`)) continue;
    await rm(resolve(DIR, tag, name));
    removed += 1;
  }
}

console.log(`${written} downloaded, ${skipped} already current, ${removed} removed`);
