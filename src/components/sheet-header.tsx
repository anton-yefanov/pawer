import { Stack } from 'expo-router';

import type { SheetHeaderProps } from '@/components/sheet-header.types';
import { headerItem, HeaderSlot } from '@/components/workout/workout-sheet-header';

/**
 * The one way a sheet declares its nav bar. On iOS it drives the native header;
 * on Android the same row is drawn in JS, because react-native-screens never
 * gives a `formSheet` an AppBar there (see sheet-header.android.tsx).
 */
export function SheetHeader({ title, left, right, options }: SheetHeaderProps) {
  return (
    <Stack.Screen
      options={{
        // Options merge across renders, so a screen that swaps a custom title
        // for a plain one has to clear headerTitle — otherwise the old element
        // (the workout's running clock) keeps rendering under the new title.
        ...(title == null || typeof title === 'string'
          ? { title: title ?? '', headerTitle: undefined }
          : { headerTitle: () => <>{title}</> }),
        unstable_headerLeftItems: () => (left ? headerItem(<HeaderSlot>{left}</HeaderSlot>) : []),
        unstable_headerRightItems: () => (right ? headerItem(<HeaderSlot>{right}</HeaderSlot>) : []),
        ...options,
      }}
    />
  );
}
