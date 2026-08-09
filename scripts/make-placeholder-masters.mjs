#!/usr/bin/env node
/**
 * Generates stand-in master PNGs so the app has real assets to render before
 * the illustrated set exists.
 *
 *   node scripts/make-placeholder-masters.mjs
 *
 * These write into assets/masters/** and are meant to be overwritten one by one
 * as real art lands — the exact filenames, sizes and bounding boxes here are
 * the contract the real masters must honour. Run build-images.mjs afterwards.
 *
 * The two exercise frames differ visibly (arms up vs. arms down) but keep the
 * cat's hips at an identical pixel position, which is the rule the real frames
 * must follow: crop each frame to its own tight box and toggling reads as a
 * glitch instead of a rep.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const INK = '#3B3226';
const FUR = '#F0A35E';
const ACCENT = '#7C6BF0';

/**
 * @param size    master canvas, square
 * @param armY    vertical position of the barbell — the only thing that moves
 * @param label   drawn faintly so placeholders are obvious in review builds
 */
function catSvg({ size, armY, label, bar }) {
  // Everything is expressed against a 1000-unit viewBox, so both frames land on
  // the same bounding box regardless of output size.
  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1000 1000">
  <g transform="scale(1)" fill="none" stroke="${INK}" stroke-width="18"
     stroke-linecap="round" stroke-linejoin="round">
    <!-- hips: FIXED at (500, 700) in both frames -->
    <ellipse cx="500" cy="700" rx="150" ry="130" fill="${FUR}"/>
    <!-- legs -->
    <path d="M420 800 L400 900 M580 800 L600 900" />
    <!-- tail -->
    <path d="M650 700 q120 -40 90 -160" />
    <!-- head -->
    <circle cx="500" cy="440" r="120" fill="${FUR}"/>
    <path d="M410 370 L395 275 L480 330 Z" fill="${FUR}"/>
    <path d="M590 370 L605 275 L520 330 Z" fill="${FUR}"/>
    <circle cx="460" cy="440" r="12" fill="${INK}" stroke="none"/>
    <circle cx="540" cy="440" r="12" fill="${INK}" stroke="none"/>
    <path d="M480 480 q20 20 40 0" />
    <!-- arms + barbell: the moving part -->
    <path d="M395 590 L330 ${armY} M605 590 L670 ${armY}" />
    ${
      bar
        ? `<line x1="230" y1="${armY}" x2="770" y2="${armY}" stroke="${ACCENT}" stroke-width="26"/>
           <circle cx="230" cy="${armY}" r="52" fill="${ACCENT}" stroke="none"/>
           <circle cx="770" cy="${armY}" r="52" fill="${ACCENT}" stroke="none"/>`
        : ''
    }
  </g>
  <text x="500" y="975" text-anchor="middle" font-family="Helvetica, sans-serif"
        font-size="38" fill="${INK}" opacity="0.35">${label}</text>
</svg>`);
}

async function write(path, svg) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, await sharp(svg).png().toBuffer());
  console.log(`  ${path.replace(`${ROOT}/`, '')}`);
}

console.log('Placeholder masters:');

// Exercise pair — 1200px, identical bounding box, arms are the only delta.
await write(
  resolve(ROOT, 'assets/masters/exercises/placeholder_1.png'),
  catSvg({ size: 1200, armY: 330, label: 'PLACEHOLDER · frame 1', bar: true })
);
await write(
  resolve(ROOT, 'assets/masters/exercises/placeholder_2.png'),
  catSvg({ size: 1200, armY: 560, label: 'PLACEHOLDER · frame 2', bar: true })
);

// Mascot states — 1024px.
await write(
  resolve(ROOT, 'assets/masters/mascot/idle.png'),
  catSvg({ size: 1024, armY: 640, label: 'MASCOT · idle', bar: false })
);
await write(
  resolve(ROOT, 'assets/masters/mascot/celebrating.png'),
  catSvg({ size: 1024, armY: 250, label: 'MASCOT · celebrating', bar: false })
);

console.log('\nNow run: npm run build:images');
