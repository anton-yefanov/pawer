import type { ImageSource } from 'expo-image';

/**
 * Mascot states. Every reaction in the app goes through this map, so adding a
 * state is one line here plus one 1024px master in assets/masters/mascot/.
 *
 * Full-body poses are portrait art on a square canvas; faces fill their canvas,
 * so the two are separate maps rather than one — a caller sizing a box has to
 * know which it is asking for.
 */
export type MascotState = 'idle' | 'celebrating' | 'resting' | 'encouraging' | 'sleeping';

export type MascotFace = 'idle' | 'winking' | 'sleeping';

const SOURCES = {
  idle: require('@/assets/mascot/idle.webp') as ImageSource,
  celebrating: require('@/assets/mascot/celebrating.webp') as ImageSource,
  resting: require('@/assets/mascot/resting.webp') as ImageSource,
  encouraging: require('@/assets/mascot/encouraging.webp') as ImageSource,
} satisfies Partial<Record<MascotState, ImageSource>>;

const FALLBACKS: Record<MascotState, keyof typeof SOURCES> = {
  idle: 'idle',
  celebrating: 'celebrating',
  resting: 'resting',
  encouraging: 'encouraging',
  sleeping: 'resting',
};

const FACES: Record<MascotFace, ImageSource> = {
  idle: require('@/assets/mascot/face-idle.webp') as ImageSource,
  winking: require('@/assets/mascot/face-winking.webp') as ImageSource,
  sleeping: require('@/assets/mascot/face-sleeping.webp') as ImageSource,
};

export function mascotImage(state: MascotState): ImageSource {
  return SOURCES[FALLBACKS[state]];
}

export function mascotFace(face: MascotFace): ImageSource {
  return FACES[face];
}
