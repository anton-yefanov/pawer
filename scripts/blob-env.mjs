/**
 * The Blob token only exists as a Vercel project env var, so anything running
 * outside Vercel reads it from `vercel env pull .env.local`.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ENV = resolve(ROOT, '.env.local');
if (existsSync(ENV)) process.loadEnvFile(ENV);

export function requireBlobToken() {
  // `vercel env pull` writes [SENSITIVE] rather than the value for a secret var.
  if (process.env.BLOB_READ_WRITE_TOKEN?.startsWith('vercel_blob_rw_')) return;
  throw new Error(
    'No BLOB_READ_WRITE_TOKEN. Add it to .env.local — the pawer-blob store token from ' +
      'https://vercel.com/dashboard/stores, or `vercel env pull .env.local` once the ' +
      'variable is available to the environment you pull.'
  );
}

export const PREFIX = 'exercise-videos/';

/** pathname -> { url, mtime }, in one listing rather than 412 head requests. */
export async function listStoredVideos() {
  const { list } = await import('@vercel/blob');
  const stored = new Map();
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      stored.set(blob.pathname.slice(PREFIX.length), {
        url: blob.url,
        mtime: Math.round(new Date(blob.uploadedAt).getTime()),
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return stored;
}
