/**
 * assets/new_exercises_data/<vendor>/<slug>.mp4 -> assets/exercise-videos/<tag>/<slug>.mp4
 *
 * The output folder is only a filing convention; the generated require map
 * already encodes it.
 *
 * The vendor's masters are 1936x1072 h264 at ~2.1 Mbps and already carry no
 * audio track. 1084x600 is exactly how wide the detail sheet draws the clip on
 * a 3x iPhone, so scaling further would only cost sharpness for bytes nobody
 * sees. Dimensions are pinned rather than derived so every clip lands
 * identical, which is what lets one aspectRatio in the component be right.
 *
 * 10-bit at CRF 30 is ~32% smaller than 8-bit CRF 26 at an SSIM drop of
 * 0.003: the extra precision keeps the flat studio backdrop from banding, and
 * aq-mode 3 keeps its dark corners from blocking at the higher CRF.
 *
 * A clip with loop points in exercise-loops.json (scripts/find-video-loops.py)
 * is cut to one seamless loop: frames [first, end) then [start, first), so it
 * still opens on the frame its poster shows. Every clip is then colour
 * corrected onto the shared grey backdrop (exercise-grade.mjs).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { colorFilter } from './exercise-grade.mjs';
import { GROUP_IDS, METADATA_PATH, VIDEOS_DIR, groupOf } from './exercise-taxonomy.mjs';

const run = promisify(execFile);
const OUT_DIR = 'assets/exercise-videos';

const SCALE = 'scale=1084:600:flags=lanczos';
const ENCODE = [
  '-an',
  '-c:v', 'libx265',
  '-pix_fmt', 'yuv420p10le',
  '-crf', '30',
  '-preset', 'veryslow',
  '-x265-params', 'aq-mode=3',
  '-tag:v', 'hvc1',
  '-movflags', '+faststart',
];

const meta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
const loops = JSON.parse(fs.readFileSync('scripts/exercise-loops.json', 'utf8'));

function filterArgs(slug, loop) {
  const finish = [SCALE, colorFilter(slug)].filter(Boolean).join(',');
  if (!loop) return ['-vf', finish];
  const { start, end, first } = loop;
  const cut = (from, to) => `trim=start_frame=${from}:end_frame=${to},setpts=PTS-STARTPTS`;
  if (first === start) return ['-vf', `${cut(start, end)},${finish}`];
  return [
    '-filter_complex',
    `[0:v]split[a][b];[a]${cut(first, end)}[head];[b]${cut(start, first)}[tail];` +
      `[head][tail]concat=n=2:v=1:a=0,${finish}[out]`,
    '-map', '[out]',
  ];
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
for (const group of GROUP_IDS) fs.mkdirSync(path.join(OUT_DIR, group), { recursive: true });

const jobs = meta.map((entry) => ({
  src: path.join(VIDEOS_DIR, entry.videoFile),
  out: path.join(OUT_DIR, groupOf(entry), `${entry.slug}.mp4`),
  slug: entry.slug,
  loop: loops[entry.slug],
}));

const missing = jobs.filter((job) => !fs.existsSync(job.src));
if (missing.length > 0) {
  throw new Error(`${missing.length} source clips missing, first: ${missing[0].src}`);
}

let done = 0;
async function worker(queue) {
  for (let job = queue.pop(); job; job = queue.pop()) {
    await run('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', job.src, ...filterArgs(job.slug, job.loop), ...ENCODE, job.out,
    ]);
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
const looped = jobs.filter((job) => job.loop).length;
console.log(
  `${jobs.length} clips (${looped} cut to a loop), ${(bytes / 1024 / 1024).toFixed(1)} MB in ${OUT_DIR}`
);
