import { list } from '@vercel/blob';
import { BLOB_PREFIX, exercises, sendJson } from './_lib.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'method not allowed' });
    return;
  }

  const uploaded = new Map();
  let cursor;
  do {
    const page = await list({ prefix: BLOB_PREFIX, cursor, limit: 1000 });
    for (const b of page.blobs) uploaded.set(b.pathname, b);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const frameOf = (sourceId, frame) => uploaded.get(`${BLOB_PREFIX}${sourceId}_${frame}.png`) ?? null;

  sendJson(
    res,
    200,
    exercises.map((e) => {
      const frames = [frameOf(e.sourceId, 1), frameOf(e.sourceId, 2)];
      return {
        ...e,
        mascot: frames.map((b) => (b ? Date.parse(b.uploadedAt) : null)),
        mascotUrl: frames.map((b) => b?.url ?? null),
      };
    }),
  );
}
