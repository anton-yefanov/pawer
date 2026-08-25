/**
 * The Blob token only exists as a Vercel project env var, so anything running
 * outside Vercel reads it from `vercel env pull .env.local`.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { ROOT } from './paths.mjs';

const ENV = resolve(ROOT, '.env.local');
if (existsSync(ENV)) process.loadEnvFile(ENV);

/** `vercel env pull` writes [SENSITIVE] rather than the value for a secret var. */
export const hasBlobToken = () =>
  process.env.BLOB_READ_WRITE_TOKEN?.startsWith('vercel_blob_rw_') === true;

export function requireBlobToken() {
  if (hasBlobToken()) return;
  throw new Error(
    'No BLOB_READ_WRITE_TOKEN. Add it to .env.local — the pawer-blob store token from ' +
      'https://vercel.com/dashboard/stores, or `vercel env pull .env.local` once the ' +
      'variable is available to the environment you pull.',
  );
}
