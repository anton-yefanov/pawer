import {
  useFonts,
  useImage,
  type SkImage,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';

export type ShareCardAssets = { fonts: SkTypefaceFontProvider; logo: SkImage };

/**
 * The two things `drawShareCard` needs that arrive asynchronously. Skia loads
 * both through hooks, so they are gathered here rather than in the renderer —
 * `drawShareCard` stays a plain function, and the spotlight can start the load
 * when the sheet opens rather than when a badge is tapped.
 *
 * Nunito is the app's own face, registered under one family so a paragraph can
 * ask for a weight rather than a file. The logo is the App Store icon itself,
 * full-bleed square — the card rounds it the way iOS does.
 */
export function useShareCardAssets(): ShareCardAssets | null {
  const fonts = useFonts({
    Nunito: [
      require('@/assets/fonts/Nunito_400Regular.ttf'),
      require('@/assets/fonts/Nunito_600SemiBold.ttf'),
      require('@/assets/fonts/Nunito_700Bold.ttf'),
    ],
  });
  const logo = useImage(require('@/assets/images/app-icon.png'));

  if (fonts == null || logo == null) return null;
  return { fonts, logo };
}
