#!/usr/bin/env node
/**
 * Local server for the image uploader (see assets/masters/README.md).
 *
 *   npm run images:web
 *
 * Uploads are written straight into assets/masters/, so git is the only store
 * and `npm run build:images` is the only step between a drop and the app.
 */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

import {
  MASTERS,
  ROOT,
  boundingBoxDrift,
  byId,
  exercises,
  masterPath,
  normalizeMaster,
} from './master-spec.mjs';

const PORT = Number(process.env.PORT ?? 4000);
const SITE = resolve(ROOT, 'tools/image-uploader');
const BODY_LIMIT = 32 * 1024 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function sendFile(res, file, cacheControl = 'no-store') {
  const stream = createReadStream(file);
  stream.on('error', () => sendJson(res, 404, { error: 'not found' }));
  stream.once('readable', () => {
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': cacheControl,
    });
    stream.pipe(res);
  });
}

function readBody(req) {
  return new Promise((ok, fail) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_LIMIT) {
        fail(new Error('file is larger than 32 MB'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => ok(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}

const mtimeOf = (file) =>
  stat(file).then(
    (s) => Math.round(s.mtimeMs),
    () => null,
  );

/** Path the browser loads a stored master back through. */
const publicPath = (file) => `/masters/${relative(MASTERS, file).split('\\').join('/')}`;

async function listExercises(res) {
  const out = [];
  for (const e of exercises) {
    const files = [masterPath(e.sourceId, 1), masterPath(e.sourceId, 2)];
    const mascot = await Promise.all(files.map(mtimeOf));
    out.push({
      ...e,
      mascot,
      mascotUrl: mascot.map((m, i) => (m ? publicPath(files[i]) : null)),
    });
  }
  sendJson(res, 200, out);
}

async function writeMaster(req, res, file, sibling) {
  const { png, warnings } = await normalizeMaster(await readBody(req));
  const drift = await boundingBoxDrift(png, sibling);
  if (drift) warnings.push(drift);
  await mkdir(resolve(file, '..'), { recursive: true });
  await writeFile(file, png);
  sendJson(res, 200, { mtime: Date.now(), url: publicPath(file), warnings });
}

async function deleteMaster(res, file) {
  await rm(file, { force: true });
  sendJson(res, 200, { mtime: null, url: null });
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const path = decodeURIComponent(url.pathname);

  if (req.method === 'GET' && path === '/api/exercises') return listExercises(res);

  const placeholder = /^\/api\/placeholder\/([12])$/.exec(path);
  if (placeholder && req.method === 'GET') {
    return sendFile(
      res,
      resolve(ROOT, `assets/exercises/detail/placeholder_${placeholder[1]}.webp`),
      'public, max-age=86400',
    );
  }

  const mascot = /^\/api\/mascot\/([A-Za-z0-9_]+)\/([12])$/.exec(path);
  if (mascot) {
    const [, id, frame] = mascot;
    // Only ids from the seed are addressable, so no request can write an arbitrary file.
    if (!byId.has(id)) return sendJson(res, 404, { error: 'unknown exercise' });
    const file = masterPath(id, frame);
    if (req.method === 'PUT') {
      return writeMaster(req, res, file, masterPath(id, frame === '1' ? 2 : 1));
    }
    if (req.method === 'DELETE') return deleteMaster(res, file);
    return sendJson(res, 405, { error: 'method not allowed' });
  }

  if (path.startsWith('/api/')) return sendJson(res, 404, { error: 'not found' });

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });

  if (path.startsWith('/masters/')) {
    const file = resolve(MASTERS, path.slice('/masters/'.length));
    if (!file.startsWith(MASTERS)) return sendJson(res, 403, { error: 'forbidden' });
    return sendFile(res, file);
  }

  const file = resolve(SITE, `.${path === '/' ? '/index.html' : path}`);
  if (!file.startsWith(SITE)) return sendJson(res, 403, { error: 'forbidden' });
  sendFile(res, file);
}

createServer((req, res) => {
  route(req, res).catch((err) => sendJson(res, 400, { error: err.message }));
}).listen(PORT, () => {
  console.log(`Image uploader on http://localhost:${PORT}`);
  console.log(`Writing masters into ${relative(process.cwd(), MASTERS)}/`);
});
