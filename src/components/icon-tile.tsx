import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { TILE_SIZE } from "@/components/grouped-list";
import { Icon, type IconName } from "@/components/icon";

const TINTS = {
  indigo: ["#8894FF", "#4E43D6"],
  blue: ["#5BB8FF", "#0A6CE8"],
  purple: ["#C08BFF", "#7B3FE4"],
  orange: ["#FFB65C", "#F0820F"],
  green: ["#5FE08C", "#1DA653"],
  teal: ["#4FDCD0", "#10A79A"],
  yellow: ["#FFD75C", "#F0A80D"],
  pink: ["#FF8FB1", "#E0246B"],
  grey: ["#B4BAC3", "#7A828E"],
} as const;

export type TileTint = keyof typeof TINTS;

export function IconTile({ name, tint }: { name: IconName; tint: TileTint }) {
  const [top, bottom] = TINTS[tint];

  return (
    <View style={styles.tile}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={tint} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" rx={8} fill={`url(#${tint})`} />
      </Svg>
      <Icon name={name} size={17} tintColor="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
