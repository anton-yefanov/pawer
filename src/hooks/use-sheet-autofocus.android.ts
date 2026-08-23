import { useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';

/** How long a formSheet takes to slide in; there is no transition callback for one. */
const SHEET_ENTRANCE_MS = 400;

/**
 * `autoFocus` focuses the field on mount, which here is while the sheet is
 * still sliding up: `KeyboardAwareScrollView` measures the input where it is at
 * that moment — down near the keyboard — and scrolls the content up to clear
 * it, so the settled sheet opens with its first row cut off by the header.
 * Focusing after the entrance animation measures the input where it lands and
 * asks for no scroll at all.
 */
export function useSheetAutoFocus(enabled: boolean) {
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => ref.current?.focus(), SHEET_ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, [enabled]);

  return [ref, false] as const;
}
