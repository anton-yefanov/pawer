#!/usr/bin/env node
/**
 * Writes the uploader's static exercises.json into public/. The page reads the
 * seed from there rather than through a function — Vercel transpiles functions
 * instead of bundling them, so a file read off the repo root does not survive
 * the deploy.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { ROOT } from '../tools/image-uploader/paths.mjs';
import { exercises } from '../tools/image-uploader/seed.mjs';

const out = resolve(ROOT, 'tools/image-uploader/public/exercises.json');
await writeFile(out, JSON.stringify(exercises));
console.log(`${exercises.length} exercises -> ${out}`);
