/**
 * assets/new_exercises_data/<vendor>/<slug>.mp4 -> assets/exercise-videos/<tag>/<slug>.mp4
 *
 * The output folder is the on-demand resource tag, which is what lets the
 * config plugin add twelve folder references instead of 412 file references.
 *
 * The vendor's masters are 1936x1072 h264 at ~2.1 Mbps and already carry no
 * audio track. 1084x600 is exactly how wide the detail sheet draws the clip on
 * a 3x iPhone, so scaling further would only cost sharpness for bytes nobody
 * sees. Dimensions are pinned rather than derived so every clip lands
 * identical, which is what lets one aspectRatio in the component be right.
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { GROUP_IDS, METADATA_PATH, VIDEOS_DIR, groupOf } from './exercise-taxonomy.mjs';

const run = promisify(execFile);
const OUT_DIR = 'assets/exercise-videos';

const ENCODE = [
  '-an',
  '-vf', 'scale=1084:600:flags=lanczos',
  '-c:v', 'libx265',
  '-crf', '26',
  '-preset', 'slow',
  '-tag:v', 'hvc1',
  '-movflags', '+faststart',
];

const meta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));

fs.rmSync(OUT_DIR, { recursive: true, force: true });
for (const group of GROUP_IDS) fs.mkdirSync(path.join(OUT_DIR, group), { recursive: true });

const jobs = meta.map((entry) => ({
  src: path.join(VIDEOS_DIR, entry.videoFile),
  out: path.join(OUT_DIR, groupOf(entry), `${entry.slug}.mp4`),
  slug: entry.slug,
}));

const missing = jobs.filter((job) => !fs.existsSync(job.src));
if (missing.length > 0) {
  throw new Error(`${missing.length} source clips missing, first: ${missing[0].src}`);
}

let done = 0;
async function worker(queue) {
  for (let job = queue.pop(); job; job = queue.pop()) {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', job.src, ...ENCODE, job.out]);
    done += 1;
    if (done % 25 === 0 || done === jobs.length) {
      process.stdout.write(`  ${done}/${jobs.length}\n`);
    }
  }
}

const queue = [...jobs];
await Promise.all(
  Array.from({ length: Math.max(1, os.cpus().length - 1) }, () => worker(queue))
);

const bytes = jobs.reduce((sum, job) => sum + fs.statSync(job.out).size, 0);
console.log(`${jobs.length} clips, ${(bytes / 1024 / 1024).toFixed(1)} MB in ${OUT_DIR}`);
