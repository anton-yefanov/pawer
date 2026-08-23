/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Every screen is a grey `background` page carrying white `surface` cards.
 * `backgroundElement` is a fill *inside* a surface — a divider, an input, a
 * chip, a card's cover — and is never itself a card on the page.
 */
export const Colors = {
  light: {
    text: '#000000',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    accent: '#007AFF',
    accentContent: '#FFFFFF',
    success: '#34C759',
    successMuted: '#DFF5E4',
    successElement: '#C6E9CF',
    danger: '#FF3B30',
    dangerMuted: '#FFEDEC',
    dangerHighlight: '#FFB3AE',
    gold: '#8A6100',
    goldMuted: '#FBEFD0',
    warmup: '#B85C00',
    drop: '#7A3EBF',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    surface: '#1C1C1E',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#0A84FF',
    accentContent: '#FFFFFF',
    success: '#30D158',
    successMuted: '#12351C',
    successElement: '#1E4D2C',
    danger: '#FF453A',
    dangerMuted: '#3A1614',
    dangerHighlight: '#6E2721',
    gold: '#F5C542',
    goldMuted: '#3A2E10',
    warmup: '#FF9F0A',
    drop: '#BF5AF2',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.4)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Scheme-independent brand colors. The launch surface paints before a color
 * scheme is resolved, and these values are mirrored by the splash and icon
 * config in `app.json` — change them together.
 */
export const Brand = {
  splash: '#208AEF',
  splashGradientStart: '#3C9FFE',
  splashGradientEnd: '#0274DF',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    /** Bundled per-weight by the `expo-font` plugin in `app.json`, which is what
     *  lets `fontWeight` resolve against it; the system face is Roboto. */
    sans: 'Nunito',
    serif: 'serif',
    /** Android ships no rounded face, so the same bundled family stands in. */
    rounded: 'Nunito',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * What lifts a floating control off the page where there is no glass to refract
 * it — soft and wide, rather than Material's tight `elevation`.
 *
 * Dark carries no shadow at all: black on a black page draws nothing, and a
 * `surface` lighter than the `background` is already the whole affordance.
 */
export const Raised = {
  light: { boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)' },
  dark: {},
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
