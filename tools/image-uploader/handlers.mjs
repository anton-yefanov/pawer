/**
 * The uploader's API, as plain (req, res) handlers so the local node:http
 * server and the Vercel functions in api/ run the exact same code.
 *
 * Nothing here reads the seed: the page loads that as a static file, and the
 * Vercel builder transpiles functions rather than bundling them, so a file read
 * off the repo would not survive the deploy.
 */
import { ZipArchive } from 'archiver';

import {
  boundingBoxDrift,
  centredCrop,
  normalizeSource,
  renderSquare,
} from './master-spec.mjs';
import {
  blobName,
  deleteMaster,
  listStored,
  putMaster,
  readBlob,
  readCrops,
  writeCrops,
} from './store.mjs';

const BODY_LIMIT = 32 * 1024 * 1024;

/** A blob key stays inside the masters prefix; the page only offers seed ids. */
const ID = /^[A-Za-z0-9_-]+$/;

export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Vercel's node runtime may have buffered the body onto req already; locally it
 * is still an unread stream.
 */
function readBody(req) {
  // Vercel's node runtime parses some content types for you: a JSON body may
  // already be an object by the time the handler runs.
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body);
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    return Promise.resolve(Buffer.from(raw));
  }
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

export async function listMasters(res) {
  sendJson(res, 200, Object.fromEntries(await listStored()));
}

export async function mascot(req, res, id, frame) {
  if (!ID.test(id ?? '') || (frame !== '1' && frame !== '2')) {
    return sendJson(res, 404, { error: 'unknown master' });
  }
  const name = blobName(id, frame);

  if (req.method === 'DELETE') {
    await deleteMaster(id, frame);
    return sendJson(res, 200, { mtime: null, url: null });
  }
  if (req.method !== 'PUT') return sendJson(res, 405, { error: 'method not allowed' });

  const { png, width, height, warnings } = await normalizeSource(await readBody(req));
  const crop = centredCrop(width, height);
  const square = await renderSquare(png, crop);

  const stored = await listStored();
  const sibling = stored.get(blobName(id, frame === '1' ? 2 : 1));
  const drift = await boundingBoxDrift(square, sibling && (await readBlob(sibling.url)));
  if (drift) warnings.push(drift);

  const crops = await readCrops();
  crops[name] = crop;
  const [written] = await Promise.all([putMaster(id, frame, square, png), writeCrops(crops)]);
  sendJson(res, 200, { ...written, crop, warnings });
}

/** Reframes an already-uploaded master: same source, a new square out of it. */
export async function reframe(req, res, id, frame) {
  if (!ID.test(id ?? '') || (frame !== '1' && frame !== '2')) {
    return sendJson(res, 404, { error: 'unknown master' });
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' });

  const name = blobName(id, frame);
  const entry = (await listStored()).get(name);
  if (!entry?.sourceUrl) {
    return sendJson(res, 409, { error: 'no source to reframe — re-upload this frame first' });
  }

  const body = JSON.parse(await readBody(req));
  const crop = { x: Number(body.x), y: Number(body.y), size: Number(body.size) };
  if (!Number.isFinite(crop.x) || !Number.isFinite(crop.y) || !(crop.size > 0)) {
    return sendJson(res, 400, { error: 'crop must be finite x, y and a positive size' });
  }

  const square = await renderSquare(await readBlob(entry.sourceUrl), crop);
  const crops = await readCrops();
  crops[name] = crop;
  const [written] = await Promise.all([putMaster(id, frame, square), writeCrops(crops)]);
  sendJson(res, 200, { ...written, crop });
}

/** Every square, named as it must land in assets/masters/exercises/. */
export async function exportSquares(req, res) {
  if (req.method !== 'GET') return sendJson(res, 405, { error: 'method not allowed' });
  const stored = await listStored();

  res.writeHead(200, {
    'content-type': 'application/zip',
    'content-disposition': 'attachment; filename="exercise-masters.zip"',
  });
  // Store rather than deflate: these are PNGs, and the archive streams out
  // rather than buffering 200 of them in a function's memory.
  const zip = new ZipArchive({ store: true });
  zip.pipe(res);
  for (const [name, { url }] of stored) {
    const png = await readBlob(url);
    if (png) zip.append(png, { name });
  }
  await zip.finalize();
}
