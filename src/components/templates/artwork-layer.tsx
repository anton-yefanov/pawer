import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { Emoji } from "@/components/emoji";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { type CardArtwork } from "@/lib/card-artwork";
import { coverPhotoSource } from "@/lib/card-photos";
import {
  ART_CORNER_SCALE,
  type ExerciseArt,
  exerciseThumbnail,
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
 * How many cells go on each row, by cell count. Six is the most a cover holds,
 * and past five thumbnails the sixth is a `+N` counter — so every longer
 * template lays out the same.
 */
const EXERCISE_ROWS: readonly (readonly number[])[] = [
  [1],
  [2],
  [3],
  [2, 2],
  [3, 2],
  [3, 3],
];
const EXERCISE_SCALE = [0.46, 0.46, 0.34, 0.38, 0.34, 0.34];
const EXERCISE_GAP_SCALE = 0.045;
const MAX_THUMBS = 5;
const RING_SCALE = 0.03;
const SHADOW_SCALE = 0.06;
/** A cover is pastel in both schemes, so what sits on it never follows the theme. */
const COVER_PAPER = Colors.light.surface;
/** Half-transparent, so the halo takes the gradient it sits on rather than cutting a hole in it. */
const COVER_RING = "rgba(255, 255, 255, 0.5)";
const COVER_INK = Colors.light.text;
const COVER_SHADOW = "rgba(0, 0, 0, 0.18)";
const COUNT_SCALE = 0.34;

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

/** The same lift the thumbnails get, cast by the glyph rather than a box. */
function emojiShadow(size: number) {
  return {
    textShadowColor: COVER_SHADOW,
    textShadowOffset: { width: 0, height: size * 0.02 },
    textShadowRadius: size * SHADOW_SCALE,
  };
}

/** An empty template is a bare gradient — the cover fills itself in as exercises land. */
function ExerciseArtwork({
  art,
  coverHeight,
}: {
  art: readonly ExerciseArt[];
  coverHeight: number;
}) {
  if (art.length === 0) return null;

  const overflow = Math.max(art.length - MAX_THUMBS, 0);
  const cells = Math.min(art.length, MAX_THUMBS + (overflow > 0 ? 1 : 0));
  const size = coverHeight * EXERCISE_SCALE[cells - 1];
  const gap = coverHeight * EXERCISE_GAP_SCALE;

  const rows = EXERCISE_ROWS[cells - 1];

  return (
    <View style={[StyleSheet.absoluteFill, styles.column, { gap }]}>
      {rows.map((count, rowIndex) => {
        const start = rows
          .slice(0, rowIndex)
          .reduce((sum, row) => sum + row, 0);
        return (
          <View key={rowIndex} style={[styles.row, { gap }]}>
            {Array.from({ length: count }, (_, index) => {
              const slot = start + index;
              return overflow > 0 && slot === cells - 1 ? (
                <OverflowCell key={slot} count={overflow} size={size} />
              ) : (
                <ThumbCell key={slot} art={art[slot]} size={size} />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

/** A custom exercise with no photo of its own stays an empty tile. */
function ThumbCell({ art, size }: { art: ExerciseArt; size: number }) {
  const thumb = exerciseThumbnail(art);
  const ring = size * RING_SCALE;

  return (
    <Ring size={size}>
      <View
        style={[
          tile(size - ring * 2, size * ART_CORNER_SCALE - ring),
          styles.disc,
        ]}
      >
        {thumb && (
          <Image
            source={thumb}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            onError={(error) => reportMissingArt(art, error)}
          />
        )}
      </View>
    </Ring>
  );
}

function OverflowCell({ count, size }: { count: number; size: number }) {
  return (
    <Ring size={size}>
      <ThemedText
        style={{
          color: COVER_INK,
          fontSize: size * COUNT_SCALE,
          lineHeight: size * COUNT_SCALE * 1.2,
        }}
      >
        {`+${count}`}
      </ThemedText>
    </Ring>
  );
}

/**
 * A wider half-transparent disc sitting *under* the thumbnail rather than a
 * border around it: a border draws its own edge against the image, and that
 * seam reads as a gap. The shadow lives out here too, where the clipped disc
 * inside cannot mask it.
 */
function Ring({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <View
      style={[
        tile(size, size * ART_CORNER_SCALE),
        styles.ring,
        { shadowRadius: size * SHADOW_SCALE },
      ]}
    >
      {children}
    </View>
  );
}

function tile(size: number, radius: number) {
  return { width: size, height: size, borderRadius: radius };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  column: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    backgroundColor: COVER_RING,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  disc: {
    backgroundColor: COVER_PAPER,
    overflow: "hidden",
  },
});
