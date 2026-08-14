#!/usr/bin/env node
/**
 * Local-only mascot artwork uploader (dev tool, never ships).
 *
 *   npm run images:web [path-to-free-exercise-db]
 *
 * Serves tools/image-uploader/index.html on http://localhost:5174 and gives it
 * the upstream reference photos plus read/write access to
 * assets/masters/exercises/. See assets/masters/README.md for the master spec.
 */
import { execFile } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PORT = Number(process.env.PORT ?? 5174);

const SOURCE = resolve(process.argv[2] ?? resolve(ROOT, '../free-exercise-db'), 'exercises');
const MASTERS = resolve(ROOT, 'assets/masters/exercises');
const MASTER_SIZE = 1200;

const exercises = JSON.parse(readFileSync(resolve(ROOT, 'src/db/seed/exercises.json'), 'utf8')).map(
  ({ sourceId, name, category, equipment, force, level, mechanic, primaryMuscles, secondaryMuscles, instructions }) => ({
    sourceId,
    name,
    category,
    equipment,
    muscle: primaryMuscles[0] ?? null,
    force,
    level,
    mechanic,
    primaryMuscles,
    secondaryMuscles,
    instructions,
  }),
);
const byId = new Map(exercises.map((e) => [e.sourceId, e]));

mkdirSync(MASTERS, { recursive: true });

const masterPath = (sourceId, frame) => resolve(MASTERS, `${sourceId}_${frame}.png`);
const originalPath = (sourceId, index) => resolve(SOURCE, sourceId, `${index}.jpg`);

function mtimeOf(file) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

function sendJson(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': buf.length });
  res.end(buf);
}

function sendFile(res, file, cache = 'no-store') {
  if (!existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream', 'cache-control': cache });
  createReadStream(file).pipe(res);
}

function readBody(req, limitBytes = 32 * 1024 * 1024) {
  return new Promise((res, rej) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) {
        rej(new Error('file is larger than 32 MB'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => res(Buffer.concat(chunks)));
    req.on('error', rej);
  });
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const SPEC = {
  format: 'PNG',
  size: `${MASTER_SIZE}x${MASTER_SIZE}`,
  shape: 'square',
  background: 'transparent',
};

/** Throws a plain Error whose message is shown verbatim on the slot. */
async function normalizeMaster(buf) {
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error('not a PNG — masters must be PNG with a transparent background');
  }
  const meta = await sharp(buf).metadata();
  if (meta.format !== 'png') throw new Error(`${meta.format} is not PNG`);
  if (meta.width !== meta.height) {
    throw new Error(`${meta.width}x${meta.height} is not square — masters must be a square canvas`);
  }
  if (!meta.hasAlpha) throw new Error('no alpha channel — the background must be transparent');

  const warnings = [];
  // An alpha channel that is fully opaque passes the check above but is still a
  // flat background — the usual sign of art exported over white.
  if ((await sharp(buf).stats()).isOpaque) {
    warnings.push('every pixel is opaque — the background should be transparent, not filled');
  }

  let out = buf;
  if (meta.width !== MASTER_SIZE) {
    warnings.push(
      `resized from ${meta.width}x${meta.width} to ${MASTER_SIZE}x${MASTER_SIZE}` +
        (meta.width < MASTER_SIZE ? ' — upscaled, so it will look softer than art drawn at full size' : ''),
    );
    out = await sharp(buf)
      .resize(MASTER_SIZE, MASTER_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
  }
  return { png: out, warnings };
}

/** Tight box around the non-transparent pixels, as a fraction of the canvas. */
async function alphaBox(buf) {
  const { info } = await sharp(buf).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
  return {
    left: info.trimOffsetLeft === undefined ? 0 : -info.trimOffsetLeft,
    top: info.trimOffsetTop === undefined ? 0 : -info.trimOffsetTop,
    width: info.width,
    height: info.height,
  };
}

/**
 * The one rule from assets/masters/README.md that a machine can actually check:
 * both frames must sit in the same bounding box, or toggling reads as a glitch
 * rather than a rep.
 */
async function boundingBoxDrift(png, siblingFile) {
  if (!existsSync(siblingFile)) return null;
  try {
    const [a, b] = await Promise.all([alphaBox(png), alphaBox(readFileSync(siblingFile))]);
    const drift = Math.max(
      Math.abs(a.left - b.left),
      Math.abs(a.top - b.top),
      Math.abs(a.left + a.width - (b.left + b.width)),
      Math.abs(a.top + a.height - (b.top + b.height)),
    );
    const tolerance = MASTER_SIZE * 0.02;
    if (drift <= tolerance) return null;
    return `art sits ${Math.round(drift)}px off the other frame's bounding box — lock the hips to a fixed point so toggling reads as a rep, not a jump`;
  } catch {
    return null; // a fully transparent frame has no box to compare
  }
}

function runBuildImages() {
  return new Promise((res) => {
    execFile('node', ['scripts/build-images.mjs'], { cwd: ROOT }, (err, stdout, stderr) => {
      res({ ok: !err, output: [stdout, stderr].filter(Boolean).join('\n').trim() || String(err ?? '') });
    });
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    if (path === '/api/exercises' && req.method === 'GET') {
      sendJson(
        res,
        200,
        exercises.map((e) => ({
          ...e,
          hasOriginal: [existsSync(originalPath(e.sourceId, 0)), existsSync(originalPath(e.sourceId, 1))],
          mascot: [mtimeOf(masterPath(e.sourceId, 1)), mtimeOf(masterPath(e.sourceId, 2))],
        })),
      );
      return;
    }

    if (path === '/api/build' && req.method === 'POST') {
      sendJson(res, 200, await runBuildImages());
      return;
    }

    const placeholder = /^\/api\/placeholder\/([12])$/.exec(path);
    if (placeholder && req.method === 'GET') {
      sendFile(res, resolve(ROOT, `assets/exercises/detail/placeholder_${placeholder[1]}.webp`), 'max-age=86400');
      return;
    }

    const asset = /^\/api\/(original|mascot)\/([^/]+)\/(\d)$/.exec(path);
    if (asset) {
      const [, kind, sourceId, frame] = asset;
      // Only ids from the seed are addressable, so no path can escape the dirs above.
      if (!byId.has(sourceId)) {
        res.writeHead(404).end('unknown exercise');
        return;
      }
      if (kind === 'original') {
        if (frame !== '0' && frame !== '1') {
          res.writeHead(404).end('bad frame');
          return;
        }
        sendFile(res, originalPath(sourceId, frame), 'max-age=86400');
        return;
      }
      if (frame !== '1' && frame !== '2') {
        res.writeHead(404).end('bad frame');
        return;
      }
      const file = masterPath(sourceId, frame);
      if (req.method === 'GET') {
        sendFile(res, file);
        return;
      }
      if (req.method === 'PUT') {
        const { png, warnings } = await normalizeMaster(await readBody(req));
        const drift = await boundingBoxDrift(png, masterPath(sourceId, frame === '1' ? 2 : 1));
        if (drift) warnings.push(drift);
        writeFileSync(file, png);
        sendJson(res, 200, { mtime: mtimeOf(file), warnings });
        return;
      }
      if (req.method === 'DELETE') {
        if (existsSync(file)) unlinkSync(file);
        sendJson(res, 200, { mtime: null });
        return;
      }
    }

    if (req.method === 'GET') {
      const name = path === '/' ? 'index.html' : path.slice(1);
      if (/^[a-z0-9.-]+$/.test(name) && existsSync(resolve(HERE, name))) {
        sendFile(res, resolve(HERE, name));
        return;
      }
    }

    res.writeHead(404).end('not found');
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use — another uploader is probably still running.`);
    console.error(`Stop it with:  kill $(lsof -ti:${PORT})    or start this one with:  PORT=5175 npm run images:web`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  const missing = exercises.filter((e) => !existsSync(originalPath(e.sourceId, 0))).length;
  console.log(`Mascot uploader   http://localhost:${PORT}`);
  console.log(`  originals       ${SOURCE}${missing ? `  (${missing} exercises have no reference photo)` : ''}`);
  console.log(`  masters         ${MASTERS}`);
});
