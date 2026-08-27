import { Text } from 'react-native';

/**
 * One emoji glyph. The system picks the emoji font, which on iOS is Apple Color
 * Emoji — so nothing is bundled and it stays sharp at any size. Android draws
 * Noto for now; an `emoji.android.tsx` sibling swaps in Apple artwork when
 * Android ships, and no caller changes.
 *
 * `lineHeight` is set because a bare emoji's default leading clips its top on
 * both platforms.
 */
export function Emoji({ value, size }: { value: string; size: number }) {
  return <Text style={{ fontSize: size, lineHeight: size * 1.2 }}>{value}</Text>;
}
