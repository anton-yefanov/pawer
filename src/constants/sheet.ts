/**
 * Shared by every tab stack that presents workout sheets. See the header comment
 * in src/app/workout/_layout.tsx for the rules that come with them.
 */
export const SHEET = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
  headerLargeTitle: false,
} as const;

/** A sheet that only ever sits at full height. */
export const FULL_SHEET = { ...SHEET, sheetAllowedDetents: [1] };
