/**
 * Vercel Blob is the store for exercise masters, so the uploader works the same
 * deployed as it does locally. `npm run masters:pull` is what brings the squares
 * down into assets/masters/ for `npm run build:images`.
 *
 * Each frame is two blobs and a crop: the source exactly as it was dropped, the
 * 1200x1200 square rendered from it, and the rectangle that ties them together.
 * Only the square ever ships.
 *
 * **Nothing is ever written twice to the same pathname.** Overwriting one serves
 * the old bytes from the CDN for a while afterwards, which reads as a save that
 * did not take. So every write lands at `<name>/<epoch>.<ext>`, `list()` — an
 * API call, always fresh — picks the newest, and older versions are pruned.
 */
import { del, list, put } from '@vercel/blob';

export const PREFIX = 'masters/exercises/';
const SOURCES = 'masters/sources/';
// Matches both `masters/crops/<epoch>.json` and the pre-versioning
// `masters/crops.json`, so every reader sees the same record.
const CROPS = 'masters/crops';

export const blobName = (sourceId, frame) => `${sourceId}_${frame}.png`;

/** name -> { url, mtime, sourceUrl, crop }, in one listing rather than 820 head requests. */
export async function listStored() {
  const squares = new Map();
  const sources = new Map();
  let crops = null;

  for (const blob of await listAll('masters/')) {
    const version = { url: blob.url, mtime: Math.round(new Date(blob.uploadedAt).getTime()) };
    if (blob.pathname.startsWith(CROPS)) {
      if (!crops || newest(version, crops)) crops = version;
    } else if (blob.pathname.startsWith(PREFIX)) {
      keepNewest(squares, name(blob.pathname, PREFIX), version);
    } else if (blob.pathname.startsWith(SOURCES)) {
      keepNewest(sources, name(blob.pathname, SOURCES), version);
    }
  }

  const rects = crops ? await readJson(crops.url) : {};
  for (const [key, entry] of squares) {
    entry.sourceUrl = sources.get(key)?.url ?? null;
    entry.crop = rects[key] ?? null;
  }
  return squares;
}

export async function readCrops() {
  const versions = await listAll(CROPS);
  if (versions.length === 0) return {};
  const newestBlob = versions.reduce((a, b) => (a.uploadedAt > b.uploadedAt ? a : b));
  return readJson(newestBlob.url);
}

export async function writeCrops(crops) {
  const pathname = `${CROPS}/${Date.now()}.json`;
  await put(pathname, Buffer.from(JSON.stringify(crops)), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    cacheControlMaxAge: 31536000,
  });
  const stale = (await listAll(CROPS)).map((b) => b.pathname).filter((p) => p !== pathname);
  if (stale.length) await del(stale);
}

export async function putMaster(sourceId, frame, square, source) {
  const key = blobName(sourceId, frame);
  const [blob] = await Promise.all([
    putVersioned(PREFIX, key, square, 'image/png'),
    source && putVersioned(SOURCES, key, source, 'image/png'),
  ]);
  return { url: blob.url, mtime: Date.now() };
}

export async function deleteMaster(sourceId, frame) {
  const key = blobName(sourceId, frame);
  await Promise.all([prune(PREFIX, key, null), prune(SOURCES, key, null)]);
  const crops = await readCrops();
  if (key in crops) {
    delete crops[key];
    await writeCrops(crops);
  }
}

export async function readBlob(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

async function readJson(url) {
  const res = await fetch(url);
  return res.ok ? res.json() : {};
}

async function listAll(prefix) {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

/** `<dir><key>/<epoch>.<ext>`, or a flat `<dir><key>` written before versioning. */
function name(pathname, dir) {
  const rest = pathname.slice(dir.length);
  const versioned = /^(.+)\/\d+\.[a-z]+$/.exec(rest);
  return versioned ? versioned[1] : rest;
}

const newest = (a, b) => a.mtime > b.mtime;

function keepNewest(map, key, version) {
  const held = map.get(key);
  if (!held || newest(version, held)) map.set(key, version);
}

async function putVersioned(dir, key, body, contentType) {
  const pathname = `${dir}${key}/${Date.now()}.png`;
  const blob = await put(pathname, body, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    // The pathname is unique, so the bytes behind it never change and the CDN
    // can hold them as long as it likes.
    cacheControlMaxAge: 31536000,
  });
  await prune(dir, key, pathname);
  return blob;
}

/** Drops every version of `key` except `keep`, including the pre-versioning one. */
async function prune(dir, key, keep) {
  const stale = (await listAll(`${dir}${key}`))
    .filter((b) => b.pathname !== keep && name(b.pathname, dir) === key)
    .map((b) => b.pathname);
  if (stale.length) await del(stale);
}
