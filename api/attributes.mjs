import { list } from '@vercel/blob';
import { ATTRIBUTE_PREFIX, attributeKey, attributesByKind, sendJson } from './_lib.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  const uploaded = new Map();
  try {
    let cursor;
    do {
      const page = await list({ prefix: ATTRIBUTE_PREFIX, cursor, limit: 1000 });
      for (const b of page.blobs) uploaded.set(b.pathname, b);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  } catch (err) {
    sendJson(res, 500, {
      error: process.env.BLOB_READ_WRITE_TOKEN
        ? `blob store unreachable: ${err.message}`
        : 'BLOB_READ_WRITE_TOKEN is not set on this deployment — connect the Blob store to the project and redeploy',
    });
    return;
  }

  const icons = [];
  for (const [kind, values] of attributesByKind) {
    for (const [slug, value] of values) {
      const blob = uploaded.get(attributeKey(kind, slug));
      icons.push({
        kind,
        slug,
        value,
        mtime: blob ? Date.parse(blob.uploadedAt) : null,
        url: blob?.url ?? null,
      });
    }
  }

  sendJson(res, 200, icons);
}
