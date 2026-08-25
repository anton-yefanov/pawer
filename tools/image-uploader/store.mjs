/**
 * Vercel Blob is the store for exercise masters, so the uploader works the same
 * deployed as it does locally. `npm run masters:pull` is what brings the blobs
 * down into assets/masters/ for `npm run build:images`.
 */
import { del, list, put } from '@vercel/blob';

export const PREFIX = 'masters/exercises/';

export const blobName = (sourceId, frame) => `${sourceId}_${frame}.png`;
const key = (sourceId, frame) => `${PREFIX}${blobName(sourceId, frame)}`;

/** name -> { url, mtime }, in one listing rather than 410 head requests. */
export async function listStored() {
  const found = new Map();
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      found.set(blob.pathname.slice(PREFIX.length), {
        url: blob.url,
        mtime: Math.round(new Date(blob.uploadedAt).getTime()),
      });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return found;
}

export async function putMaster(sourceId, frame, png) {
  // A stable pathname is what lets the page cache-bust with ?v=<mtime> instead
  // of re-reading the listing after every write.
  const blob = await put(key(sourceId, frame), png, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return { url: blob.url, mtime: Date.now() };
}

export async function deleteMaster(sourceId, frame) {
  await del(key(sourceId, frame));
}

export async function readMaster(url) {
  const res = await fetch(`${url}?v=${Date.now()}`);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}
