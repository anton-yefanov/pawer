import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, sendJson } from '../_lib.mjs';

export default function handler(req, res) {
  const { frame } = req.query;
  if (frame !== '1' && frame !== '2') {
    sendJson(res, 404, { error: 'bad frame' });
    return;
  }
  res.setHeader('content-type', 'image/webp');
  res.setHeader('cache-control', 'public, max-age=86400');
  res.status(200).send(readFileSync(resolve(ROOT, `assets/exercises/detail/placeholder_${frame}.webp`)));
}
