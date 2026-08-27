import { Spacing } from '@/constants/theme';

/**
 * Shared by every tab stack that presents workout sheets. See the header comment
 * in src/app/workout/_layout.tsx for the rules that come with them.
 */
export const SHEET = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  /**
   * Negative means `UISheetPresentationControllerAutomaticDimension`. Never set a
   * number here: on iOS 26 the automatic radius is concentric with the device's
   * display corners, and it is also what opts the sheet into the floating
   * appearance — inset by an even margin on the sides and bottom at any detent
   * below full height. Any explicit radius pins the sheet back to the edges.
   */
  sheetCornerRadius: -1,
  headerLargeTitle: false,
} as const;

/**
 * The radius for a sheet that has to stay pinned to the screen edges: an
 * explicit value is what opts out of the iOS 26 floating appearance. Split per
 * platform so asking for it doesn't change a sheet's corners on Android, where
 * every sheet already carries one radius.
 */
export const PINNED_CORNER_RADIUS = 38;

/**
 * The radius for a card inset from a sheet's own edges by `Spacing.three`.
 * Concentric with the sheet rather than equal to it: two arcs of the same
 * radius at different insets read as mismatched, a tighter inner one reads as
 * one shape.
 */
export const SHEET_INNER_RADIUS = PINNED_CORNER_RADIUS - Spacing.three;

/** A sheet that only ever sits at full height. */
export const FULL_SHEET = { ...SHEET, sheetAllowedDetents: [1] };

/**
 * Top inset for content that positions itself absolutely inside a sheet. A
 * sheet starts below the notch, so the window safe-area inset is wrong there,
 * but 0 puts content under the grabber and the rounded top corners.
 */
export const SHEET_TOP_INSET = 14;

/**
 * Bottom inset for the same content: the home indicator only. A sheet covers
 * the tab bar, but `useSafeAreaInsets` inside one still reports the tab bar's
 * height on top of the indicator, which floats anything pinned to the bottom a
 * whole tab bar too high.
 */
export const SHEET_BOTTOM_INSET = 34;

/**
 * Spread onto any scrollable inside a sheet. Nothing on iOS, where UIKit
 * already hands the scroll view the gesture first — see the Android file.
 */
export const SHEET_SCROLL = {} as const;

/**
 * A detail sheet: opens at a partial height and expands to full. Android has
 * its own definition — see the note there.
 */
export const DETAIL_SHEET = {
  ...SHEET,
  sheetAllowedDetents: [0.6, 1],
  sheetInitialDetentIndex: 0,
};
