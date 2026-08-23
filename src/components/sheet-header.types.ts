import type { Stack } from 'expo-router';

type ScreenOptions = React.ComponentProps<typeof Stack.Screen>['options'];

export type SheetHeaderProps = {
  /** A string goes to the native title; an element replaces it wholesale. */
  title?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
  /** Anything else the screen sets — `contentStyle` and friends. */
  options?: ScreenOptions;
};
