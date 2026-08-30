import { Stack } from "expo-router";

import { tabBarScreenLayout } from "@/components/app-tabs";
import {
  stackScreenOptions,
  surfacePageOptions,
  TAB_ROOT_HEADER,
} from "@/constants/navigation";
import {
  DETAIL_SHEET,
  FULL_SHEET,
  PINNED_CORNER_RADIUS,
  SHEET,
} from "@/constants/sheet";
import { useTheme } from "@/hooks/use-theme";

/**
 * Sheets are siblings in this Stack, not nested stacks. react-native-screens
 * presents each modal from the previously presented one, so pushing
 * `add-exercise` while `active` is up gives a real sheet-on-sheet and `back()`
 * dismisses exactly one level. Two rules that come with it: never `replace`
 * between two modal routes, and never dismiss and present in the same tick —
 * both make RNSScreenStack bail out. The sibling arrangement is also what
 * keeps this working on Android, where a `formSheet` is a Material bottom sheet
 * that cannot host a nested stack at all. There the sheet's grabber is content
 * rather than chrome, so a new sheet renders either `SheetHeader`, which draws
 * one, or `SheetGrabber` itself.
 */
export default function WorkoutLayout() {
  const theme = useTheme();

  return (
    <Stack screenOptions={stackScreenOptions(theme)} screenLayout={tabBarScreenLayout}>
      <Stack.Screen
        name="index"
        options={{ title: "Home", ...TAB_ROOT_HEADER }}
      />
      <Stack.Screen name="active" options={{ ...FULL_SHEET, title: "" }} />
      {/*
        Both pickers render their own floating search row, so they want no nav
        bar at all. It has to be turned off here: `headerShown: false` from
        inside the screen doesn't take once the native header exists, and an
        empty-titled header still insets the list under it by its own height.
      */}
      <Stack.Screen
        name="add-exercise"
        options={{
          ...FULL_SHEET,
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
      {/* The recap of a session that has just been finished. It is presented
          over the tab root rather than over the logger — the logger's sheet is
          dismissed first (see `presentWorkoutSummary`) — and its detents match a
          template's sheet: it opens at 60% and expands. */}
      <Stack.Screen
        name="summary"
        options={{
          ...DETAIL_SHEET,
          sheetCornerRadius: PINNED_CORNER_RADIUS,
          headerShown: false,
        }}
      />
      <Stack.Screen name="new-exercise" options={FULL_SHEET} />
      <Stack.Screen name="exercise/edit" options={FULL_SHEET} />
      {/* The exercise name and its buttons live in the content, under the
          images — an empty nav bar would only be a band of white above them,
          and turning it off from inside the screen never takes. */}
      <Stack.Screen
        name="exercise/[id]"
        options={{
          ...DETAIL_SHEET,
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
      <Stack.Screen
        name="template/new"
        options={{ ...FULL_SHEET, title: "New Template" }}
      />
      <Stack.Screen
        name="template/edit"
        options={{ ...FULL_SHEET, title: "Edit Template" }}
      />
      <Stack.Screen
        name="template/add-exercises"
        options={{
          ...FULL_SHEET,
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
      {/* Explicit radius, so the sheet stays pinned to the edges instead of
          taking iOS 26's floating inset appearance below full height. The
          floating sheet is composited offscreen (mask + shadow), and a
          UIVisualEffectView inside one can't sample a backdrop — every glass
          control in the sheet falls back to a flat fill until the full detent.
          The constant is platform-split, so Android keeps its shared radius. */}
      <Stack.Screen
        name="template/[id]"
        options={{
          ...DETAIL_SHEET,
          sheetCornerRadius: PINNED_CORNER_RADIUS,
        }}
      />
      <Stack.Screen
        name="folder/[id]"
        options={DETAIL_SHEET}
      />
      {/* Full height whatever it is showing: the sheet draws its own Close and
          Save where a nav bar's buttons would be, and the emoji picker step
          needs the whole screen. */}
      <Stack.Screen
        name="customize"
        options={{
          ...SHEET,
          sheetAllowedDetents: [1],
          headerShown: false,
          ...surfacePageOptions(theme),
        }}
      />
    </Stack>
  );
}
