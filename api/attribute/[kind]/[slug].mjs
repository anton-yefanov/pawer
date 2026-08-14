import { del, put } from '@vercel/blob';
import {
  ATTRIBUTE_MASTER_SIZE,
  attributeKey,
  attributesByKind,
  normalizeMaster,
  readBody,
  sendJson,
} from '../../_lib.mjs';

export default async function handler(req, res) {
  const { kind, slug } = req.query;

  // Only kind/slug pairs from the seed vocabulary are addressable.
  if (!attributesByKind.get(kind)?.has(slug)) {
    sendJson(res, 404, { error: 'unknown attribute' });
    return;
  }

  const key = attributeKey(kind, slug);

  try {
    if (req.method === 'PUT') {
      const { png, warnings } = await normalizeMaster(await readBody(req), ATTRIBUTE_MASTER_SIZE);
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
