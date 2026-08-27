import { StyleSheet, View } from 'react-native';

import { Emoji } from '@/components/emoji';
import { type CardArtwork } from '@/lib/card-artwork';

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

export function ArtworkLayer({
  artwork,
  coverHeight,
}: {
  artwork: CardArtwork | null;
  coverHeight: number;
}) {
  if (!artwork) return null;

  const size = coverHeight * EMOJI_SCALE[artwork.emojis.length - 1];

  return (
    <View style={[StyleSheet.absoluteFill, styles.row, { gap: coverHeight * GAP_SCALE }]}>
      {artwork.emojis.map((emoji, index) => (
        <Emoji key={`${emoji}-${index}`} value={emoji} size={size} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
