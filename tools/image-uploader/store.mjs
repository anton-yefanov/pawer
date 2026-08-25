/**
 * Vercel Blob is the store for exercise masters, so the uploader works the same
 * deployed as it does locally. `npm run masters:pull` is what brings the squares
 * down into assets/masters/ for `npm run build:images`.
 *
 * Each frame is two blobs and a crop: the source exactly as it was dropped, the
 * 1200x1200 square rendered from it, and the rectangle that ties them together.
 * Only the square ever ships.
 */
import { del, list, put } from '@vercel/blob';

export const PREFIX = 'masters/exercises/';
const SOURCES = 'masters/sources/';
const CROPS = 'masters/crops.json';

export const blobName = (sourceId, frame) => `${sourceId}_${frame}.png`;

/** name -> { url, mtime, sourceUrl, crop }, in one listing rather than 820 head requests. */
export async function listStored() {
  const squares = new Map();
  const sources = new Map();
  let crops = null;

  let cursor;
  do {
    const page = await list({ prefix: 'masters/', cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (blob.pathname === CROPS) crops = blob.url;
      else if (blob.pathname.startsWith(PREFIX)) {
        squares.set(blob.pathname.slice(PREFIX.length), {
          url: blob.url,
          mtime: Math.round(new Date(blob.uploadedAt).getTime()),
        });
      } else if (blob.pathname.startsWith(SOURCES)) {
        sources.set(blob.pathname.slice(SOURCES.length), blob.url);
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const rects = crops ? await readJson(crops) : {};
  for (const [name, entry] of squares) {
    entry.sourceUrl = sources.get(name) ?? null;
    entry.crop = rects[name] ?? null;
  }
  return squares;
}

export async function readCrops() {
  const page = await list({ prefix: CROPS, limit: 1 });
  const blob = page.blobs.find((b) => b.pathname === CROPS);
  return blob ? await readJson(blob.url) : {};
}

export async function writeCrops(crops) {
  await putBlob(CROPS, Buffer.from(JSON.stringify(crops)), 'application/json');
}

export async function putMaster(sourceId, frame, square, source) {
  const [blob] = await Promise.all([
    putBlob(`${PREFIX}${blobName(sourceId, frame)}`, square, 'image/png'),
    source && putBlob(`${SOURCES}${blobName(sourceId, frame)}`, source, 'image/png'),
  ]);
  return { url: blob.url, mtime: Date.now() };
}

export async function deleteMaster(sourceId, frame) {
  const name = blobName(sourceId, frame);
  await Promise.all([del(`${PREFIX}${name}`), del(`${SOURCES}${name}`).catch(() => {})]);
  const crops = await readCrops();
  if (name in crops) {
    delete crops[name];
    await writeCrops(crops);
  }
}

export async function readBlob(url) {
  const res = await fetch(`${url}?v=${Date.now()}`);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function readJson(url) {
  const res = await fetch(`${url}?v=${Date.now()}`);
  return res.ok ? res.json() : {};
}

// A stable pathname is what lets the page cache-bust with ?v=<mtime> instead of
// re-reading the listing after every write.
const putBlob = (pathname, body, contentType) =>
  put(pathname, body, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
