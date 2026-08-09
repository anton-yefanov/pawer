import type { ImageSource } from 'expo-image';

/**
 * Mascot states. Every reaction in the app goes through this map, so adding a
 * state is one line here plus one 1024px master in assets/masters/mascot/.
 *
 * Until the real art exists, unmapped states fall back to `idle`.
 */
export type MascotState =
  | 'idle'
  | 'celebrating'
  /** Aliases that currently share a placeholder — real art will split these. */
  | 'resting'
  | 'encouraging'
  | 'sleeping';

const SOURCES = {
  idle: require('@/assets/mascot/idle.webp') as ImageSource,
  celebrating: require('@/assets/mascot/celebrating.webp') as ImageSource,
} satisfies Partial<Record<MascotState, ImageSource>>;

const FALLBACKS: Record<MascotState, keyof typeof SOURCES> = {
  idle: 'idle',
  celebrating: 'celebrating',
  resting: 'idle',
  encouraging: 'celebrating',
  sleeping: 'idle',
};

export function mascotImage(state: MascotState): ImageSource {
  return SOURCES[FALLBACKS[state]];
}
