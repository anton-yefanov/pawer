import type { ImageSource } from 'expo-image';

import { asCardColor, type CardColor } from '@/constants/card-colors';

const SOURCES: Record<CardColor, ImageSource> = {
  grey: require('@/assets/backgrounds/grey.webp'),
  orange: require('@/assets/backgrounds/orange.webp'),
  red: require('@/assets/backgrounds/red.webp'),
  pink: require('@/assets/backgrounds/pink.webp'),
  purple: require('@/assets/backgrounds/purple.webp'),
  blue: require('@/assets/backgrounds/blue.webp'),
  green: require('@/assets/backgrounds/green.webp'),
  black: require('@/assets/backgrounds/black.webp'),
};

export function cardBackground(color: CardColor | string | null | undefined): ImageSource {
  return SOURCES[asCardColor(color)];
}
