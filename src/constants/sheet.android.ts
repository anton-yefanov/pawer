/**
 * `formSheet` is a Material bottom sheet (`BottomSheetBehaviour`) here, so
 * `sheetExpandsWhenScrolledToEdge` is left off. `sheetGrabberVisible` is worse
 * than ignored — the native side stores it and draws nothing — so the handle is
 * `SheetGrabber`, drawn in the sheet's own content. `sheetCornerRadius` does
 * work, and without it every sheet is square: the JS default is -1 and Android
 * clamps that to 0. `sheetAllowedDetents` works too, capped at three ascending
 * values; a formSheet cannot host a nested stack, which is the sibling-sheet
 * arrangement the layouts already use.
 */
export const SHEET = {
  presentation: 'formSheet',
  sheetCornerRadius: 28,
} as const;

/**
 * `sheetShouldOverflowTopInset` stays at its default `false`, so full height
 * means "below the status bar" and the detent fractions are measured against
 * that same box.
 *
 * The drag stays enabled: pulling anywhere on the sheet dismisses it, and the
 * content still scrolls, because `BottomSheetBehavior` is patched to decide
 * between the two at touch down rather than mid-gesture. See the patch note on
 * `isDraggableOnNestedScroll` and `SHEET_SCROLL`, which are what make that
 * choice possible at all.
 */
export const FULL_SHEET = {
  ...SHEET,
  sheetAllowedDetents: [1],
} as const;

/** Every sheet takes the same corners here; see the iOS file for why one asks. */
export const PINNED_CORNER_RADIUS = 28;

/**
 * Top inset for content that positions itself absolutely inside a sheet: the
 * rounded top corners, plus the pill `SheetGrabber` floats over them.
 */
export const SHEET_TOP_INSET = 20;

/**
 * The sheet is a dialog and covers the navigation bar, so this is the gesture
 * bar's height. Same reason as iOS for it being a constant: `useSafeAreaInsets`
 * inside the sheet reports the tab bar the sheet is covering.
 */
export const SHEET_BOTTOM_INSET = 24;

/**
 * Spread onto any scrollable inside a sheet. A `formSheet` is a Material
 * bottom sheet here, and `BottomSheetBehavior` only lets a downward drag scroll
 * the content instead of collapsing the sheet once it has found a nested
 * scrolling child under it. React Native leaves `nestedScrollEnabled` off, so
 * without this the sheet is what every drag over the content moves, and nothing
 * scrolls at all.
 */
export const SHEET_SCROLL = { nestedScrollEnabled: true } as const;

/**
 * A resizable sheet, matching iOS. Two detents make this a peeking Material
 * bottom sheet: the `Screen` is laid out at the full height either way and the
 * collapsed detent only offsets its top, so the sheet shows the top 60% of a
 * full-height layout and the rest sits below the visible edge — the same fact
 * `SheetFooter` exists for.
 *
 * The scroll viewport is therefore full height too, which is what makes the
 * gestures come out right at the collapsed detent: content that fits has nothing
 * to scroll, so `SheetBehavior` resolves no scrollable and every drag moves the
 * sheet; content that overflows resolves one, and `BottomSheetBehavior` spends an
 * upward drag on expanding the sheet before it scrolls, which is what
 * `sheetExpandsWhenScrolledToEdge` does on iOS.
 */
export const DETAIL_SHEET = {
  ...SHEET,
  sheetAllowedDetents: [0.6, 1],
  sheetInitialDetentIndex: 0,
} as const;
