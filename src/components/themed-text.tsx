import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor, Type, type TypeRole, type TypeWeight, Weights } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: TypeRole | 'code';
  weight?: TypeWeight;
  /** Fixed-width figures, for anything that ticks or lines up in a column. */
  numeric?: boolean;
  themeColor?: ThemeColor;
};

/**
 * Every string in the app. A caller picks a role from `Type`, never a size — the
 * scale is the only place a `fontSize` is written, which is what keeps a section
 * header from being three different things on three screens.
 */
export function ThemedText({
  style,
  type = 'body',
  weight,
  numeric,
  themeColor,
  maxFontSizeMultiplier,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? SCALE_CAP[type]}
      style={[
        base,
        styles[type],
        { color: theme[themeColor ?? 'text'] },
        weight && { fontWeight: Weights[weight] },
        numeric && tabular,
        style,
      ]}
      {...rest}
    />
  );
}

/**
 * iOS resolves the system face by falling through, so only Android is named —
 * left alone it lands on Roboto, which is the loudest Material tell in the app.
 */
export const base = Platform.select({ android: { fontFamily: Fonts.sans } });

const tabular = StyleSheet.create({ nums: { fontVariant: ['tabular-nums'] } }).nums;

/**
 * How far Dynamic Type may take each role. Titles are already large and sit in
 * layouts that cannot reflow much; the small roles carry the labels someone
 * turning text up is actually trying to read, so they get the most room.
 */
const SCALE_CAP: Record<TypeRole | 'code', number> = {
  largeTitle: 1.2,
  title1: 1.2,
  title2: 1.2,
  title3: 1.3,
  headline: 1.4,
  body: 1.4,
  callout: 1.4,
  subhead: 1.4,
  footnote: 1.6,
  caption1: 1.6,
  caption2: 1.6,
  code: 1.4,
};

const styles = StyleSheet.create({
  ...Type,
  code: { ...Type.caption1, fontFamily: Fonts.mono },
});
