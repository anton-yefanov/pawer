#!/usr/bin/env node
/**
 * Local host for the image uploader (see assets/masters/README.md).
 *
 *   npm run images:web
 *
 * Same handlers the deployed api/ functions run — Vercel Blob is the store in
 * both, so a drop here and a drop on the deployment land in the same place.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { extname, resolve } from 'node:path';

import { hasBlobToken } from './local-env.mjs';
import { listMasters, mascot, sendJson } from './handlers.mjs';
import { ROOT } from './paths.mjs';

const PORT = Number(process.env.PORT ?? 4000);
const SITE = resolve(ROOT, 'tools/image-uploader/public');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function sendFile(res, file) {
  const stream = createReadStream(file);
  stream.on('error', () => sendJson(res, 404, { error: 'not found' }));
  stream.once('readable', () => {
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    stream.pipe(res);
  });
}

async function route(req, res) {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (req.method === 'GET' && path === '/api/masters') return listMasters(res);

  const match = /^\/api\/mascot\/([A-Za-z0-9_]+)\/([12])$/.exec(path);
  if (match) return mascot(req, res, match[1], match[2]);

  if (path.startsWith('/api/')) return sendJson(res, 404, { error: 'not found' });
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });

  const file = resolve(SITE, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(SITE)) return sendJson(res, 403, { error: 'forbidden' });
  sendFile(res, file);
}

createServer((req, res) => {
  route(req, res).catch((err) => sendJson(res, 400, { error: err.message }));
}).listen(PORT, () => {
  console.log(`Image uploader on http://localhost:${PORT}`);
  if (!hasBlobToken()) {
    console.log('No BLOB_READ_WRITE_TOKEN — set one in .env.local or uploads will fail.');
  }
});
