#!/usr/bin/env node
/**
 * Blob store → assets/masters/exercises/ (see assets/masters/README.md).
 *
 *   npm run masters:pull
 *
 * The deployed uploader (tools/image-uploader/) writes masters to Vercel Blob so
 * two people can fill them in together. Git is still the source of truth for the
 * artwork, so this pulls them back down; `npm run build:images` then regenerates
 * the shipped WebP.
 *
 * Needs BLOB_READ_WRITE_TOKEN — `vercel env pull` writes it into .env.local.
 */
import { list } from '@vercel/blob';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MASTERS = resolve(ROOT, 'assets/masters/exercises');
const PREFIX = 'masters/exercises/';

const envFile = resolve(ROOT, '.env.local');
if (!process.env.BLOB_READ_WRITE_TOKEN && existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?BLOB_READ_WRITE_TOKEN\s*=\s*"?([^"\n]+)"?/.exec(line);
    if (m) process.env.BLOB_READ_WRITE_TOKEN = m[1].trim();
  }
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is not set — run `vercel env pull` first.');
  process.exit(1);
}

mkdirSync(MASTERS, { recursive: true });

const blobs = [];
let cursor;
do {
  const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
  blobs.push(...page.blobs);
  cursor = page.hasMore ? page.cursor : undefined;
} while (cursor);

let written = 0;
let skipped = 0;

for (const blob of blobs) {
  const name = blob.pathname.slice(PREFIX.length);
  if (!/^[A-Za-z0-9_]+_[12]\.png$/.test(name)) {
    console.warn(`skipping unexpected key ${blob.pathname}`);
    continue;
  }
  const file = resolve(MASTERS, name);
  if (existsSync(file) && statSync(file).mtimeMs >= Date.parse(blob.uploadedAt)) {
    skipped += 1;
    continue;
  }
  const res = await fetch(blob.url);
  if (!res.ok) {
    console.error(`${name}: ${res.status} ${res.statusText}`);
    continue;
  }
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  written += 1;
  console.log(`  ${name}`);
}

console.log(`\n${written} written, ${skipped} already current, ${blobs.length} in the store.`);
console.log('Run `npm run build:images` to regenerate the shipped WebP.');
