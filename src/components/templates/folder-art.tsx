import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ArtworkLayer } from '@/components/templates/artwork-layer';
import { asCardColor, type CardColor } from '@/constants/card-colors';
import { CardRaisedShape } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { type CardArtwork } from '@/lib/card-artwork';
import { folderIcon, FOLDER_FACE_TOP, FOLDER_ICON_ASPECT } from '@/lib/folder-icons';

/**
 * The folder illustration wearing its artwork. Emoji are laid out against the
 * front panel rather than the whole icon, so they land in the middle of the
 * face instead of riding up behind the tab.
 */
export function FolderArt({
  color,
  artwork,
  width,
}: {
  color: CardColor | null;
  artwork: CardArtwork | null;
  width: number;
}) {
  const scheme = useColorScheme();
  const height = width / FOLDER_ICON_ASPECT;
  const faceTop = height * FOLDER_FACE_TOP;
  const faceHeight = height - faceTop;

  return (
    // The shadow sits on the wrapper: expo-image clips to its own bounds,
    // which cut the silhouette off along the icon's right and bottom.
    <View style={{ width, height, ...CardRaisedShape[scheme] }}>
      <Image
        source={folderIcon(asCardColor(color))}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
      />
      <View style={[styles.face, { top: faceTop, height: faceHeight }]}>
        <ArtworkLayer artwork={artwork} coverHeight={faceHeight} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
