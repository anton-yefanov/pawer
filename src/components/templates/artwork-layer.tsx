import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Emoji } from "@/components/emoji";
import { COVER_ASPECT, coverRadius } from "@/components/templates/grid-card";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { type CardArtwork } from "@/lib/card-artwork";
import { coverPhotoSource } from "@/lib/card-photos";
import {
  type ExerciseArt,
  exercisePoster,
  reportMissingArt,
} from "@/lib/exercise-media";
import { report } from "@/lib/observability";

/**
 * The artwork a card cover draws over its gradient. The only place the one/two/
 * three sizing lives, so a card, the customize preview and a slot tile all
 * scale the same way.
 *
 * Sizes are fractions of the cover's *height*, which is why callers hand one in
 * rather than letting the row measure itself: a measured size would draw the
 * emoji a frame late, and a card grid full of those flickers on every scroll.
 */
const EMOJI_SCALE = [0.5, 0.37, 0.26];
const GAP_SCALE = 0.03;

/**
 * Four cells at most, the fourth a `+N` counter once a template runs past four
 * exercises — so a long template lays out like a four-exercise one.
 */
const MAX_CELLS = 4;
/** The inset around the cells and the gap between them: one value, because a
 *  cell's margin to the cover's edge has to match its margin to its neighbour. */
const EXERCISE_GAP_SCALE = 0.055;
const SHADOW_SCALE = 0.06;
/** A cover is pastel in both schemes, so what sits on it never follows the theme. */
const COVER_PAPER = Colors.light.surface;
/** The counter is a hole in the grid, not a fifth exercise: white washed over
 *  the cover rather than the paper a thumbnail sits on, with the ink dropped to
 *  match. A real blur was tried and there is nothing behind it to blur. */
const COVER_WASH = "rgba(255, 255, 255, 0.45)";
const COVER_WASH_INK = "rgba(0, 0, 0, 0.55)";
const COVER_SHADOW = "rgba(0, 0, 0, 0.18)";
const COUNT_SCALE = 0.14;

export function ArtworkLayer({
  artwork,
  coverHeight,
  exerciseArt,
}: {
  artwork: CardArtwork | null;
  coverHeight: number;
  exerciseArt?: readonly ExerciseArt[];
}) {
  if (!artwork) return null;

  // A photo is already cropped to the cover's aspect, and the gradient behind
  // it is what shows if the file has gone missing.
  if (artwork.kind === "photo") {
    return (
      <Image
        source={coverPhotoSource(artwork.file)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onError={({ error }) =>
          report("photos", new Error(error || "Cover photo failed to load"))
        }
      />
    );
  }

  if (artwork.kind === "exercises") {
    return (
      <ExerciseArtwork art={exerciseArt ?? []} coverHeight={coverHeight} />
    );
  }

  const size = coverHeight * EMOJI_SCALE[artwork.emojis.length - 1];

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.row,
        { gap: coverHeight * GAP_SCALE },
      ]}
    >
      {artwork.emojis.map((emoji, index) => (
        <Emoji
          key={`${emoji}-${index}`}
          value={emoji}
          size={size}
          style={emojiShadow(size)}
        />
      ))}
    </View>
  );
}

/** A glyph sits straight on the gradient, so it casts its own lift. */
function emojiShadow(size: number) {
  return {
    textShadowColor: COVER_SHADOW,
    textShadowOffset: { width: 0, height: size * 0.02 },
    textShadowRadius: size * SHADOW_SCALE,
  };
}

/** An empty template is a bare cover — it fills itself in as exercises land. */
function ExerciseArtwork({
  art,
  coverHeight,
}: {
  art: readonly ExerciseArt[];
  coverHeight: number;
}) {
  if (art.length === 0) return null;

  // Four exercises fill the four cells; a fifth turns the last cell into the
  // counter, so it stands for the fourth exercise onwards.
  const overflow = art.length > MAX_CELLS ? art.length - (MAX_CELLS - 1) : 0;
  const thumbs = art.slice(0, MAX_CELLS - (overflow > 0 ? 1 : 0));
  const gap = coverHeight * EXERCISE_GAP_SCALE;
  // Concentric with the cover rather than equal to it, the same rule a card
  // inset in a sheet follows: the outer arc less the inset the cells sit at.
  const radius = coverRadius(coverHeight * COVER_ASPECT) - gap;
  const countSize = coverHeight * COUNT_SCALE;

  const cells = [
    ...thumbs.map((entry, index) => (
      <ThumbCell key={index} art={entry} radius={radius} />
    )),
    ...(overflow > 0
      ? [
          <OverflowCell
            key="overflow"
            count={overflow}
            radius={radius}
            fontSize={countSize}
          />,
        ]
      : []),
  ];

  // Flex rather than a sizing table: the cells divide whatever the cover is,
  // so the inset, the gaps and the cell size stay in step at any width without
  // this ever measuring anything.
  return (
    <View style={[StyleSheet.absoluteFill, { padding: gap, gap }]}>
      {cells.length === 3 ? (
        <View style={[styles.spread, styles.rowFlow, { gap }]}>
          {cells[0]}
          <View style={[styles.spread, { gap }]}>
            {cells[1]}
            {cells[2]}
          </View>
        </View>
      ) : cells.length === 4 ? (
        <>
          <View style={[styles.spread, styles.rowFlow, { gap }]}>
            {cells[0]}
            {cells[1]}
          </View>
          <View style={[styles.spread, styles.rowFlow, { gap }]}>
            {cells[2]}
            {cells[3]}
          </View>
        </>
      ) : (
        <View style={[styles.spread, styles.rowFlow, { gap }]}>{cells}</View>
      )}
    </View>
  );
}

/**
 * A custom exercise with no photo of its own stays an empty tile.
 *
 * The poster, not the thumbnail: a thumbnail is 150px for a 48pt list row, and
 * a cell here is up to a whole card wide, where that reads as a blur. The
 * poster is 720px and already bundled, so the sharpness costs nothing.
 */
function ThumbCell({ art, radius }: { art: ExerciseArt; radius: number }) {
  const poster = exercisePoster(art);

  return (
    <Tile radius={radius}>
      {poster && (
        <Image
          source={poster}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          onError={(error) => reportMissingArt(art, error)}
        />
      )}
    </Tile>
  );
}

function OverflowCell({
  count,
  radius,
  fontSize,
}: {
  count: number;
  radius: number;
  fontSize: number;
}) {
  return (
    <View style={[styles.counter, { borderRadius: radius }]}>
      <ThemedText
        weight="semibold"
        style={{ color: COVER_WASH_INK, fontSize, lineHeight: fontSize * 1.2 }}
      >
        {`+${count}`}
      </ThemedText>
    </View>
  );
}

/**
 * One cell of the grid. It takes its size from its share of the cover rather
 * than from a fraction of the height, which is why the thumbnail inside is no
 * longer square: a cell fills the space it is given.
 */
function Tile({
  radius,
  children,
}: {
  radius: number;
  children: React.ReactNode;
}) {
  return <View style={[styles.tile, { borderRadius: radius }]}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  spread: {
    flex: 1,
  },
  rowFlow: {
    flexDirection: "row",
  },
  counter: {
    flex: 1,
    backgroundColor: COVER_WASH,
    alignItems: "center",
    justifyContent: "center",
  },
  tile: {
    flex: 1,
    backgroundColor: COVER_PAPER,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
