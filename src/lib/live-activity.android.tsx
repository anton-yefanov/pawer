import type { ReactNode } from 'react';

/**
 * Android has no Live Activity. `expo-widgets` does ship an Android side, but
 * it is Glance home-screen widgets — a different surface with no notion of an
 * ongoing, system-placed activity — so there is nothing to mirror the workout
 * onto and this build ships without one.
 *
 * The split is a whole file rather than a `Platform.OS` guard because the iOS
 * module reaches `live-activity-layout.tsx` at import time, and that evaluates
 * `@expo/ui/swift-ui` hosts and registers the activity before any guard could
 * run.
 */
export function WorkoutActivityProvider({ children }: { children: ReactNode }) {
  return children;
}
