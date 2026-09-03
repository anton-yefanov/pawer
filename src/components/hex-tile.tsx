import { type ImageSource } from "expo-image";
import { useId } from "react";
import {
  type ImageSourcePropType,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Svg, { ClipPath, Defs, Image as SvgImage, Path } from "react-native-svg";

import { HEX_ASPECT, hexagonPath } from "@/lib/hexagon";

/**
 * The hexagon every exercise miniature is cut to. `width` is the point-to-point
 * span; the frame is shorter than it is wide, which is what keeps a row of
 * these the same width as the squares they replaced.
 *
 * The art is clipped inside the SVG rather than by an `overflow: hidden` view —
 * a view can only clip to a rounded rectangle — so it is `react-native-svg`'s
 * image here and not `expo-image`.
 */
export function HexTile({
  width,
  fill,
  source,
  style,
  children,
}: {
  width: number;
  fill: string;
  source?: ImageSource | null;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  // `useId` hands back «r0»-style ids, which cannot survive a `url(#…)` reference.
  const clip = `hex${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const height = width * HEX_ASPECT;
  const path = hexagonPath(width);

  return (
    <View style={[{ width, height }, styles.tile, style]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <ClipPath id={clip}>
            <Path d={path} />
          </ClipPath>
        </Defs>
        <Path d={path} fill={fill} />
        {source && (
          <SvgImage
            href={source as ImageSourcePropType}
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clip})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
  },
});
