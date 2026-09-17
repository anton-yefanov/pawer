/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { TINTS, type TintId } from '@/constants/tints';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResolvedTint } from '@/lib/theme-preference';

type Scheme = keyof typeof Colors;

// Built once per pair so `theme` keeps a stable identity, as `Colors[scheme]`
// did — effects and worklets list it as a dependency.
const THEMES = Object.fromEntries(
  (Object.keys(TINTS) as TintId[]).map((tint) => [
    tint,
    {
      light: { ...Colors.light, ...TINTS[tint].light },
      dark: { ...Colors.dark, ...TINTS[tint].dark },
    },
  ])
) as Record<TintId, Record<Scheme, Record<keyof typeof Colors.light, string>>>;

export function useTheme() {
  return THEMES[useResolvedTint()][useColorScheme()];
}
