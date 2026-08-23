/**
 * Android mounts `react-native-keyboard-controller` here; every other platform
 * gets nothing.
 *
 * iOS already has keyboard handling it likes — the native stack insets its own
 * scroll views — and the controller installs a window-level observer that would
 * change that, so it stays out of the iOS tree entirely (see the Android
 * sibling, and `keyboard-scroll-view.tsx` for the consumer side).
 */
export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  return children;
}
