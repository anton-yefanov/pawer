import type { ThemeColor } from "@/constants/theme";

type Theme = Record<ThemeColor, string>;

/** The screen options shared by every tab's root Stack. */
export function stackScreenOptions(theme: Theme) {
  return {
    headerShown: true,
    headerTintColor: theme.text,
    contentStyle: { backgroundColor: theme.background },
  } as const;
}

/** A tab root's own header options. */
export const TAB_ROOT_HEADER = { headerLargeTitle: true } as const;

/** A screen that is a full-bleed list of edge-to-edge rows, so white throughout. */
export function surfacePageOptions(theme: Theme) {
  return { contentStyle: { backgroundColor: theme.surface } } as const;
}

/** The tab bar sits in the layout, so a list only ever needs its own padding. */
export const TAB_CONTENT_INSET = 0;
