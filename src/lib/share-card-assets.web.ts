export type ShareCardAssets = { fonts: unknown; logo: unknown };

/** Nothing to load: there is no card to draw on web. */
export function useShareCardAssets(): ShareCardAssets | null {
  return null;
}
