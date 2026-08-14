import { del, head, put } from '@vercel/blob';
import { blobKey, boundingBoxDrift, byId, normalizeMaster, readBody, sendJson } from '../../_lib.mjs';

async function siblingUrl(sourceId, frame) {
  try {
    return (await head(blobKey(sourceId, frame === '1' ? 2 : 1))).url;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const { id, frame } = req.query;

  // Only ids from the seed are addressable, so no request can write an arbitrary key.
  if (!byId.has(id)) {
    sendJson(res, 404, { error: 'unknown exercise' });
    return;
  }
  if (frame !== '1' && frame !== '2') {
    sendJson(res, 404, { error: 'bad frame' });
    return;
  }

  const key = blobKey(id, frame);

  try {
    if (req.method === 'PUT') {
      const { png, warnings } = await normalizeMaster(await readBody(req));
      const drift = await boundingBoxDrift(png, await siblingUrl(id, frame));
      if (drift) warnings.push(drift);
      const blob = await put(key, png, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'image/png',
        cacheControlMaxAge: 60,
      });
      sendJson(res, 200, { mtime: Date.now(), url: blob.url, warnings });
      return;
    }

    if (req.method === 'DELETE') {
      await del(key);
      sendJson(res, 200, { mtime: null, url: null });
      return;
    }

    sendJson(res, 405, { error: 'method not allowed' });
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
}
