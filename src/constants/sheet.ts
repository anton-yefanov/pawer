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
