#!/usr/bin/env node
// Synthesizes the rest-timer notification tones into assets/sounds/*.wav.
//
// iOS will not let a local notification use a system alert tone, so every sound
// the picker offers has to ship in the bundle. These are generated rather than
// licensed, and mastered a few dB hotter than Apple's default tone because the
// alert has to land across a gym — the peak ceiling below is what keeps "louder"
// from becoming "harsh".

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const PEAK = 0.89; // -1 dBFS
const DRIVE = 1.7; // tanh knee: lifts the body without squaring off the transient
const FADE_MS = 4;

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/** amp is relative within a sound; decay is in e-folds per second. */
const SOUNDS = {
  chime: {
    duration: 1.1,
    partials: [
      { freq: 880, amp: 1, decay: 5.5 },
      { freq: 1760, amp: 0.22, decay: 8 },
      { freq: 1318.51, amp: 0.95, decay: 5, start: 0.16 },
      { freq: 2637.02, amp: 0.2, decay: 7.5, start: 0.16 },
    ],
  },
  bell: {
    duration: 1.6,
    partials: [
      { freq: 660, amp: 1, decay: 3 },
      { freq: 1821.6, amp: 0.4, decay: 4.5 },
      { freq: 3564, amp: 0.18, decay: 7 },
      { freq: 330, amp: 0.5, decay: 2.2 },
    ],
  },
  marimba: {
    duration: 0.9,
    partials: [
      { freq: 523.25, amp: 1, decay: 14 },
      { freq: 2093, amp: 0.3, decay: 22 },
      { freq: 698.46, amp: 0.9, decay: 14, start: 0.13 },
      { freq: 2793.83, amp: 0.26, decay: 22, start: 0.13 },
    ],
  },
  beep: {
    duration: 0.75,
    partials: [0, 0.16, 0.32].flatMap((start) => [
      { freq: 1046.5, amp: 1, decay: 26, start },
      { freq: 3139.5, amp: 0.3, decay: 30, start },
      { freq: 5232.5, amp: 0.12, decay: 34, start },
    ]),
  },
  pulse: {
    duration: 1,
    partials: [
      { freq: 196, amp: 1, decay: 9 },
      { freq: 392, amp: 0.35, decay: 11 },
      { freq: 293.66, amp: 1, decay: 9, start: 0.22 },
      { freq: 587.33, amp: 0.33, decay: 11, start: 0.22 },
    ],
  },
};

function render({ duration, partials }) {
  const length = Math.round(duration * RATE);
  const samples = new Float64Array(length);

  for (const { freq, amp, decay, start = 0 } of partials) {
    const from = Math.round(start * RATE);
    for (let i = from; i < length; i++) {
      const t = (i - from) / RATE;
      samples[i] += amp * Math.exp(-t * decay) * Math.sin(2 * Math.PI * freq * t);
    }
  }

  const peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const knee = Math.tanh(DRIVE);
  for (let i = 0; i < length; i++) samples[i] = Math.tanh((samples[i] / peak) * DRIVE) / knee;

  // A tone that starts or stops on a non-zero sample clicks through a phone
  // speaker, which reads as a broken file rather than a short one.
  const fade = Math.round((FADE_MS / 1000) * RATE);
  for (let i = 0; i < fade; i++) {
    samples[i] *= i / fade;
    samples[length - 1 - i] *= i / fade;
  }

  const limit = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const gain = (PEAK / limit) * 32767;
  const pcm = Buffer.alloc(length * 2);
  let sum = 0;
  for (let i = 0; i < length; i++) {
    const value = Math.round(samples[i] * gain);
    sum += (value / 32767) ** 2;
    pcm.writeInt16LE(value, i * 2);
  }

  return { pcm, rms: 10 * Math.log10(sum / length) };
}

function wav(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

mkdirSync(OUT_DIR, { recursive: true });

for (const [name, spec] of Object.entries(SOUNDS)) {
  const { pcm, rms } = render(spec);
  const file = join(OUT_DIR, `${name}.wav`);
  writeFileSync(file, wav(pcm));
  console.log(
    `${name}.wav  ${spec.duration.toFixed(2)}s  ${(pcm.length / 1024).toFixed(0)} KB  peak -1.0 dBFS  rms ${rms.toFixed(1)} dBFS`
  );
}
