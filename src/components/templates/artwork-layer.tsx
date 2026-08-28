import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { type CardArtwork } from '@/lib/card-artwork';
import { coverPhotoSource } from '@/lib/card-photos';
import { type ExerciseArt, exerciseThumbnail } from '@/lib/exercise-media';

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
const EXERCISE_ROWS: readonly (readonly number[])[] = [[1], [2], [3], [2, 2], [3, 2], [3, 3]];
const EXERCISE_SCALE = [0.46, 0.46, 0.34, 0.38, 0.34, 0.34];
const EXERCISE_GAP_SCALE = 0.045;
const MAX_THUMBS = 5;
const RING_SCALE = 0.03;
/** A cover is pastel in both schemes, so what sits on it never follows the theme. */
const COVER_PAPER = Colors.light.surface;
const COVER_INK = Colors.light.text;
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
  if (artwork.kind === 'photo') {
    return (
      <Image
        source={coverPhotoSource(artwork.file)}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
    );
  }

  if (artwork.kind === 'exercises') {
    return <ExerciseArtwork art={exerciseArt ?? []} coverHeight={coverHeight} />;
  }

  const size = coverHeight * EMOJI_SCALE[artwork.emojis.length - 1];

  return (
    <View style={[StyleSheet.absoluteFill, styles.row, { gap: coverHeight * GAP_SCALE }]}>
      {artwork.emojis.map((emoji, index) => (
        <Emoji key={`${emoji}-${index}`} value={emoji} size={size} />
      ))}
    </View>
  );
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
        const start = rows.slice(0, rowIndex).reduce((sum, row) => sum + row, 0);
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

/** A custom exercise with no photo of its own stays an empty ring. */
function ThumbCell({ art, size }: { art: ExerciseArt; size: number }) {
  const thumb = exerciseThumbnail(art);

  return (
    <View style={[circle(size), styles.cell]}>
      {thumb && <Image source={thumb} style={StyleSheet.absoluteFill} contentFit="cover" />}
    </View>
  );
}

function OverflowCell({ count, size }: { count: number; size: number }) {
  return (
    <View style={[circle(size), styles.cell]}>
      <ThemedText
        style={{
          color: COVER_INK,
          fontSize: size * COUNT_SCALE,
          lineHeight: size * COUNT_SCALE * 1.2,
        }}>
        {`+${count}`}
      </ThemedText>
    </View>
  );
}

function circle(size: number) {
  return {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: size * RING_SCALE,
  };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  column: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    borderColor: COVER_PAPER,
    backgroundColor: COVER_PAPER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
