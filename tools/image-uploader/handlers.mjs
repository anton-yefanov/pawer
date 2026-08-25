/**
 * The uploader's API, as plain (req, res) handlers so the local node:http
 * server and the Vercel functions in api/ run the exact same code.
 *
 * Nothing here reads the seed: the page loads that as a static file, and the
 * Vercel builder transpiles functions rather than bundling them, so a file read
 * off the repo would not survive the deploy.
 */
import { boundingBoxDrift, normalizeMaster } from './master-spec.mjs';
import { blobName, deleteMaster, listStored, putMaster, readMaster } from './store.mjs';

const BODY_LIMIT = 32 * 1024 * 1024;

/** A blob key stays inside the masters prefix; the page only offers seed ids. */
const ID = /^[A-Za-z0-9_]+$/;

export function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Vercel's node runtime may have buffered the body onto req already; locally it
 * is still an unread stream.
 */
function readBody(req) {
  if (req.body) return Promise.resolve(Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body));
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

  if (req.method === 'DELETE') {
    await deleteMaster(id, frame);
    return sendJson(res, 200, { mtime: null, url: null });
  }
  if (req.method !== 'PUT') return sendJson(res, 405, { error: 'method not allowed' });

  const { png, warnings } = await normalizeMaster(await readBody(req));
  const sibling = (await listStored()).get(blobName(id, frame === '1' ? 2 : 1));
  const drift = await boundingBoxDrift(png, sibling && (await readMaster(sibling.url)));
  if (drift) warnings.push(drift);

  sendJson(res, 200, { ...(await putMaster(id, frame, png)), warnings });
}
