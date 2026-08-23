import { useRef } from 'react';
import type { TextInput } from 'react-native';

/**
 * Focusing the first field of a sheet as it opens. On iOS `autoFocus` is all it
 * takes and the ref goes unused; the Android sibling is where the work is.
 */
export function useSheetAutoFocus(enabled: boolean) {
  const ref = useRef<TextInput>(null);

  return [ref, enabled] as const;
}
