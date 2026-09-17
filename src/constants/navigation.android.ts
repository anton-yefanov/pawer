import { BottomTabInset, Fonts, type ThemeColor } from "@/constants/theme";

type Theme = Record<ThemeColor, string>;

/**
 * The header is painted as the page, not as a raised surface: Android's default
 * top app bar takes its background from the navigation theme's `card`, which
 * would read as a white bar floating over the grey page on every screen.
 */
export function stackScreenOptions(theme: Theme) {
  return {
    headerShown: true,
    headerTintColor: theme.text,
    headerTitleStyle: { fontFamily: Fonts.sans },
    headerStyle: { backgroundColor: theme.background },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.background },
  } as const;
}

export function surfacePageOptions(theme: Theme) {
  return {
    headerStyle: { backgroundColor: theme.surface },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: theme.surface },
  } as const;
}

/**
 * The tab bar floats over the page rather than taking layout space, so a
 * full-bleed list under it has to clear the bar itself. The tab roots that
 * scroll a page already add `BottomTabInset` by hand; this is for the ones
 * handing their clearance to a shared component.
 */
export const TAB_CONTENT_INSET = BottomTabInset;
